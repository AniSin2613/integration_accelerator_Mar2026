import { BadGatewayException, BadRequestException, GatewayTimeoutException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CamelService } from '../camel/camel.service';
import { DriftDetectionService } from '../target-profiles/drift-detection.service';
import { ProfilesService } from '../profiles/profiles.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Base directory for route files; shared Docker volume is mounted here.
const ROUTES_DIR = process.env.CAMEL_ROUTES_DIR ?? '/app/camel-routes';

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly camel: CamelService,
    private readonly driftDetection: DriftDetectionService,
    private readonly profiles: ProfilesService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE — instantiate a new integration draft from a template
  // ═══════════════════════════════════════════════════════════════════════════

  async createFromTemplate(dto: {
    workspaceId?: string;
    workspaceSlug?: string;
    templateDefId: string;
    name: string;
    createdBy?: string;
  }) {
    const workspaceId = await this.resolveWorkspaceId(dto.workspaceId, dto.workspaceSlug);

    // Resolve the template and its latest published version
    const template = await this.prisma.templateDefinition.findUnique({
      where: { id: dto.templateDefId },
      include: {
        versions: {
          where: { isLatest: true },
          take: 1,
          include: {
            schemaPacks: {
              include: { schemaPack: { include: { fields: true } } },
            },
          },
        },
      },
    });
    if (!template) throw new NotFoundException(`Template ${dto.templateDefId} not found`);
    const latestVersion = template.versions[0];
    if (!latestVersion) throw new BadRequestException(`Template ${dto.templateDefId} has no published version`);

    // Extract baseline defaults from the template version
    const workflowStructure = (latestVersion.workflowStructure as any) ?? {};
    const defaultMappings = (latestVersion.defaultMappings as any) ?? {};

    // Build baseline source/target state from schema pack bindings
    const sourceBinding = latestVersion.schemaPacks.find((sp) => sp.role === 'SOURCE');
    const targetBinding = latestVersion.schemaPacks.find((sp) => sp.role === 'TARGET');

    // Allow template to supply pre-configured source/target state overriding schema-pack defaults
    const sourceState = defaultMappings.sourceStateBaseline ?? (sourceBinding ? {
      primary: {
        connectionId: '',
        connectionName: '',
        connectionFamily: '',
        healthStatus: '',
        businessObject: sourceBinding.schemaPack.object,
        operation: 'GET',
        endpointPath: '',
        queryParams: [],
        headers: [],
        customParams: [],
        paginationEnabled: false,
        paginationStrategy: 'None',
        pageSize: 100,
        incrementalReadMode: 'Off',
      },
      enrichmentSources: [],
      processingPattern: 'Single Source',
    } : null);

    const targetState = defaultMappings.targetStateBaseline ?? (targetBinding ? {
      targets: [{
        id: 't1',
        name: targetBinding.schemaPack.system + ' Primary',
        priority: 1,
        connectionId: '',
        connectionName: '',
        connectionFamily: '',
        healthStatus: '',
        businessObject: targetBinding.schemaPack.object,
        operation: 'POST',
        endpointPath: '',
        writeMode: 'Create',
        upsertKeyField: '',
        batchSize: 1,
        params: [],
        conflictHandling: 'Overwrite',
      }],
      deliveryPattern: 'Single Target',
      targetProfileState: null,
    } : null);

    // Build baseline validation from template defaults
    const validationState = defaultMappings.validationBaseline ?? { rules: [], policyMode: 'Balanced', errorConfig: { logEnabled: true, dlqEnabled: false, dlqTopic: '', notifyChannel: 'None', notifyRecipients: '', includeRecordData: false } };

    // Auto-generate IS_NOT_EMPTY rules for required target fields not already covered
    if (targetBinding?.schemaPack?.fields) {
      const existingFields = new Set((validationState.rules ?? []).map((r: any) => r.field));
      const requiredFields = targetBinding.schemaPack.fields.filter((f) => f.required);
      for (const field of requiredFields) {
        if (!existingFields.has(field.path)) {
          validationState.rules = validationState.rules ?? [];
          validationState.rules.push({
            id: `va_${field.path.replace(/[^a-zA-Z0-9]/g, '_')}`,
            name: `${field.path} is required`,
            field: field.path,
            operator: 'IS_NOT_EMPTY',
            value: '',
            severity: 'Error',
            enabled: true,
            source: 'auto',
          });
        }
      }
    }

    // Build baseline trigger
    const triggerState = workflowStructure.triggerBaseline ?? {
      triggerType: 'Schedule / Cron',
      cronExpression: '',
      timezone: 'UTC',
      webhookPath: '',
      webhookMethod: 'POST',
      manualExecutionEnabled: true,
      description: '',
    };

    // Build baseline response handling
    const responseHandlingState = defaultMappings.responseHandlingBaseline ?? {
      successPolicy: '2xx only',
      errorPolicy: 'Normalize & Route',
      callbackEnabled: false,
      callbackDestination: '',
      callbackMethod: 'POST',
      businessResponseMappingEnabled: false,
      partialSuccessPolicy: 'All-or-nothing',
    };

    // Build baseline operations/monitoring
    const operationsState = defaultMappings.operationsBaseline ?? {
      alertChannel: 'None',
      alertDestination: '',
      errorThresholdPercent: 5,
      enableRetry: false,
      maxRetries: 3,
      retryDelayMs: 5000,
      deadLetterEnabled: false,
      deadLetterTopic: '',
      telemetryMode: 'Standard',
      diagnosticsLevel: 'Basic',
      traceRetentionDays: 7,
    };

    const targetProfileFamilyId =
      latestVersion.targetProfileFamilyId ??
      (targetBinding
        ? (
            await this.prisma.profileFamily.findFirst({
              where: {
                direction: 'TARGET' as any,
                system: targetBinding.schemaPack.system,
                interfaceName: targetBinding.schemaPack.object,
              },
              select: { id: true },
            })
          )?.id ?? null
        : null);

    const defaultTargetProfile = targetProfileFamilyId
      ? await this.prisma.targetProfile.findFirst({
          where: { profileFamilyId: targetProfileFamilyId },
          orderBy: [{ isPublished: 'desc' }, { updatedAt: 'desc' }],
          select: { id: true },
        })
      : null;

    const pinned = await this.profiles.resolvePinnedProfilesForTemplate(workspaceId, latestVersion.id);

    const integration = await this.prisma.integrationDefinition.create({
      data: {
        workspaceId,
        templateDefId: dto.templateDefId,
        templateVersionId: latestVersion.id,
        name: dto.name,
        status: 'DRAFT',
        targetProfileId: defaultTargetProfile?.id ?? null,
        sourceState: sourceState ?? undefined,
        targetState: targetState ?? undefined,
        triggerState,
        validationState,
        responseHandlingState,
        operationsState,
        pinnedSourceEffectiveProfileVersionId: pinned.source.effectiveProfileVersionId,
        pinnedTargetEffectiveProfileVersionId: pinned.target.effectiveProfileVersionId,
        sourceProfileUpdateStatus: pinned.source.updateStatus as any,
        targetProfileUpdateStatus: pinned.target.updateStatus as any,
        sourceSchemaHash: pinned.source.schemaHash,
        targetSchemaHash: pinned.target.schemaHash,
        sourceProfileImpactLevel: pinned.source.impactLevel as any,
        targetProfileImpactLevel: pinned.target.impactLevel as any,
        profileReviewRequired:
          pinned.source.updateStatus === 'REVIEW_REQUIRED' ||
          pinned.source.updateStatus === 'END_OF_SUPPORT' ||
          pinned.source.updateStatus === 'BLOCKED_BY_PROFILE_CHANGE' ||
          pinned.target.updateStatus === 'REVIEW_REQUIRED' ||
          pinned.target.updateStatus === 'END_OF_SUPPORT' ||
          pinned.target.updateStatus === 'BLOCKED_BY_PROFILE_CHANGE',
        createdBy: dto.createdBy,
        updatedBy: dto.createdBy,
      },
      include: {
        templateVersion: {
          include: {
            templateDef: { select: { name: true, sourceSystem: true, targetSystem: true } },
            schemaPacks: {
              include: {
                schemaPack: {
                  select: {
                    id: true,
                    name: true,
                    system: true,
                    object: true,
                    version: true,
                    fields: {
                      orderBy: { path: 'asc' },
                      select: {
                        path: true,
                        dataType: true,
                        required: true,
                        description: true,
                        example: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        workspace: {
          select: { id: true, slug: true },
        },
      },
    });

    // Create baseline mapping set from template defaults if available
    if (defaultMappings.mappings && Array.isArray(defaultMappings.mappings) && defaultMappings.mappings.length > 0) {
      await this.prisma.mappingSet.create({
        data: {
          integrationDefId: integration.id,
          version: 1,
          rules: {
            create: defaultMappings.mappings.map((m: any) => ({
              sourceField: m.sourceField ?? m.source ?? '',
              targetField: m.targetField ?? m.target ?? '',
              mappingType: m.mappingType ?? 'DIRECT',
              transformConfig: m.transformConfig ?? undefined,
              status: 'PENDING_REVIEW',
            })),
          },
        },
      });
    }

    return integration;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE DRAFT — persist builder state back to the integration
  // ═══════════════════════════════════════════════════════════════════════════

  async saveDraft(id: string, draft: {
    name?: string;
    sourceState?: unknown;
    targetState?: unknown;
    triggerState?: unknown;
    validationState?: unknown;
    responseHandlingState?: unknown;
    operationsState?: unknown;
    sourceConnectionId?: string | null;
    targetConnectionId?: string | null;
    updatedBy?: string;
  }) {
    const integration = await this.prisma.integrationDefinition.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);

    const data: any = {
      updatedBy: draft.updatedBy,
    };

    if (draft.name !== undefined) data.name = draft.name;
    if (draft.sourceState !== undefined) data.sourceState = draft.sourceState as any;
    if (draft.targetState !== undefined) data.targetState = draft.targetState as any;
    if (draft.triggerState !== undefined) data.triggerState = draft.triggerState as any;
    if (draft.validationState !== undefined) data.validationState = draft.validationState as any;
    if (draft.responseHandlingState !== undefined) data.responseHandlingState = draft.responseHandlingState as any;
    if (draft.operationsState !== undefined) data.operationsState = draft.operationsState as any;
    if (draft.sourceConnectionId !== undefined) data.sourceConnectionId = draft.sourceConnectionId;
    if (draft.targetConnectionId !== undefined) data.targetConnectionId = draft.targetConnectionId;

    return this.prisma.integrationDefinition.update({
      where: { id },
      data,
      include: {
        templateVersion: {
          include: { templateDef: { select: { name: true, sourceSystem: true, targetSystem: true } } },
        },
        targetProfile: {
          select: { id: true, name: true, system: true, object: true, isPublished: true },
        },
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // READINESS — compute and persist readiness status
  // ═══════════════════════════════════════════════════════════════════════════

  async computeReadiness(id: string) {
    await this.profiles.refreshIntegrationProfileStatus(id).catch(() => undefined);

    const integration = await this.prisma.integrationDefinition.findUnique({
      where: { id },
      include: {
        mappingSets: {
          orderBy: { version: 'desc' },
          take: 1,
          include: { rules: true },
        },
        targetProfile: {
          include: {
            schemaPack: { include: { fields: true } },
            fields: true,
          },
        },
        pinnedSourceEffectiveProfileVersion: {
          include: {
            baselineProfileVersion: {
              select: { status: true, endOfSupportAt: true },
            },
          },
        },
        pinnedTargetEffectiveProfileVersion: {
          include: {
            baselineProfileVersion: {
              select: { status: true, endOfSupportAt: true },
            },
          },
        },
      },
    });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);

    const sourceState = integration.sourceState as any;
    const targetState = integration.targetState as any;
    const validationState = integration.validationState as any;
    const triggerState = integration.triggerState as any;
    const ms = integration.mappingSets[0];
    const mappingRules = ms?.rules ?? [];

    // Check individual readiness conditions
    const sourceConfigured = !!(sourceState?.primary?.connectionId || sourceState?.primary?.businessObject);
    const targetConfigured = !!(targetState?.targets?.length > 0 && (targetState.targets[0]?.connectionId || targetState.targets[0]?.businessObject));
    const triggerConfigured = !!(triggerState?.cronExpression || triggerState?.webhookPath || triggerState?.manualExecutionEnabled);
    const hasMappings = mappingRules.length > 0;
    const validationConfigured = !!(validationState?.rules?.length > 0);
    const lastTestStatus = integration.lastTestStatus;
    const blockedByProfileLifecycle =
      integration.sourceProfileUpdateStatus === 'END_OF_SUPPORT' ||
      integration.targetProfileUpdateStatus === 'END_OF_SUPPORT' ||
      integration.sourceProfileUpdateStatus === 'BLOCKED_BY_PROFILE_CHANGE' ||
      integration.targetProfileUpdateStatus === 'BLOCKED_BY_PROFILE_CHANGE' ||
      integration.sourceProfileImpactLevel === 'BLOCKING' ||
      integration.targetProfileImpactLevel === 'BLOCKING';

    // Derive readiness status
    let readinessStatus: string;
    if (blockedByProfileLifecycle) {
      readinessStatus = 'VALIDATION_ISSUES';
    } else if (lastTestStatus === 'success' && sourceConfigured && targetConfigured && hasMappings && validationConfigured) {
      readinessStatus = 'READY_FOR_RELEASE_REVIEW';
    } else if (lastTestStatus === 'success') {
      readinessStatus = 'TEST_PASSED';
    } else if (lastTestStatus === 'error') {
      readinessStatus = 'TEST_FAILED';
    } else if (!sourceConfigured || !targetConfigured || !hasMappings) {
      readinessStatus = 'INCOMPLETE';
    } else if (validationConfigured && sourceConfigured && targetConfigured && hasMappings) {
      readinessStatus = 'CONFIGURED';
    } else {
      readinessStatus = 'INCOMPLETE';
    }

    await this.prisma.integrationDefinition.update({
      where: { id },
      data: { readinessStatus: readinessStatus as any },
    });

    return {
      readinessStatus,
      checks: {
        sourceConfigured,
        targetConfigured,
        triggerConfigured,
        hasMappings,
        mappingRuleCount: mappingRules.length,
        validationConfigured,
        validationRuleCount: (validationState?.rules ?? []).length,
        lastTestStatus,
        lastTestAt: integration.lastTestAt,
        blockedByProfileLifecycle,
        sourceProfileUpdateStatus: integration.sourceProfileUpdateStatus,
        targetProfileUpdateStatus: integration.targetProfileUpdateStatus,
        sourceProfileImpactLevel: integration.sourceProfileImpactLevel,
        targetProfileImpactLevel: integration.targetProfileImpactLevel,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MARK READY FOR RELEASE REVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  async markReadyForReview(id: string) {
    const readiness = await this.computeReadiness(id);
    if (readiness.readinessStatus !== 'READY_FOR_RELEASE_REVIEW' && readiness.readinessStatus !== 'TEST_PASSED') {
      throw new BadRequestException(
        `Integration is not ready for release review. Current status: ${readiness.readinessStatus}. ` +
        `Ensure source/target are configured, mappings exist, validation is set, and tests pass.`
      );
    }

    await this.prisma.integrationDefinition.update({
      where: { id },
      data: {
        readinessStatus: 'READY_FOR_RELEASE_REVIEW',
        builderStatus: 'COMPLETE',
      },
    });

    return { readinessStatus: 'READY_FOR_RELEASE_REVIEW', checks: readiness.checks };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE DRAFT VERSION — increment draft version number
  // ═══════════════════════════════════════════════════════════════════════════

  async incrementDraftVersion(id: string) {
    const integration = await this.prisma.integrationDefinition.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);

    return this.prisma.integrationDefinition.update({
      where: { id },
      data: { draftVersion: integration.draftVersion + 1 },
    });
  }

  async findAll() {
    const rows = await this.prisma.integrationDefinition.findMany({
      include: {
        templateVersion: {
          include: { templateDef: { select: { name: true, sourceSystem: true, targetSystem: true } } },
        },
        releaseArtifacts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => ({
      ...row,
      templateVersion: row.templateVersion
        ? {
            ...row.templateVersion,
            templateDefinition: (row.templateVersion as any).templateDef,
          }
        : null,
      lastDeployedAt: row.releaseArtifacts[0]?.createdAt ?? null,
    }));
  }

  async findOne(id: string) {
    await this.profiles.refreshIntegrationProfileStatus(id).catch(() => undefined);

    const integration = await this.prisma.integrationDefinition.findUnique({
      where: { id },
      include: {
        templateVersion: {
          include: {
            templateDef: { select: { name: true, sourceSystem: true, targetSystem: true } },
            schemaPacks: {
              include: {
                schemaPack: {
                  select: {
                    id: true,
                    name: true,
                    system: true,
                    object: true,
                    fields: {
                      select: { path: true, dataType: true, required: true, description: true, example: true },
                    },
                  },
                },
              },
            },
          },
        },
        workspace: {
          select: { id: true, slug: true },
        },
        mappingSets: {
          include: { rules: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { version: 'desc' },
          take: 1,
        },
        testRuns: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
        releaseArtifacts: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            version: true,
            status: true,
            createdAt: true,
            environmentReleases: {
              select: {
                environment: {
                  select: {
                    type: true,
                  },
                },
              },
            },
          },
        },
        targetProfile: {
          select: { id: true, name: true, system: true, object: true, isPublished: true },
        },
        pinnedSourceEffectiveProfileVersion: {
          select: {
            id: true,
            effectiveSchemaSnapshot: true,
            schemaHash: true,
            publishedAt: true,
            profileFamily: { select: { id: true, direction: true, system: true, interfaceName: true, object: true } },
            baselineProfileVersion: { select: { id: true, version: true, status: true, endOfSupportAt: true } },
          },
        },
        pinnedTargetEffectiveProfileVersion: {
          include: {
            profileFamily: { select: { id: true, direction: true, system: true, interfaceName: true, object: true } },
            baselineProfileVersion: { select: { id: true, version: true, status: true, endOfSupportAt: true } },
          },
        },
      },
    });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);
    return {
      ...integration,
      templateVersion: integration.templateVersion
        ? {
            ...integration.templateVersion,
            templateDefinition: (integration.templateVersion as any).templateDef,
          }
        : null,
    };
  }

  async remove(id: string) {
    const integration = await this.prisma.integrationDefinition.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);

    await this.prisma.$transaction(async (tx) => {
      // Delete children in dependency order for relations declared with onDelete: Restrict.
      const releaseArtifacts = await tx.releaseArtifact.findMany({
        where: { integrationDefId: id },
        select: { id: true },
      });
      const releaseArtifactIds = releaseArtifacts.map((row) => row.id);

      if (releaseArtifactIds.length > 0) {
        await tx.approvalRequest.deleteMany({
          where: { releaseArtifactId: { in: releaseArtifactIds } },
        });
        await tx.environmentRelease.deleteMany({
          where: { releaseArtifactId: { in: releaseArtifactIds } },
        });
        await tx.releaseArtifact.deleteMany({
          where: { id: { in: releaseArtifactIds } },
        });
      }

      const mappingSets = await tx.mappingSet.findMany({
        where: { integrationDefId: id },
        select: { id: true },
      });
      const mappingSetIds = mappingSets.map((row) => row.id);

      if (mappingSetIds.length > 0) {
        await tx.mappingRule.deleteMany({
          where: { mappingSetId: { in: mappingSetIds } },
        });
        await tx.mappingSet.deleteMany({
          where: { id: { in: mappingSetIds } },
        });
      }

      await tx.demoTargetReceipt.deleteMany({ where: { integrationDefId: id } });
      await tx.integrationTestRun.deleteMany({ where: { integrationDefId: id } });
      await tx.profileRebasePlan.deleteMany({ where: { integrationDefId: id } });
      await tx.profileUpdateNotice.deleteMany({ where: { integrationDefId: id } });

      await tx.integrationDefinition.delete({ where: { id } });
    });

    return { id, deleted: true };
  }

  async setTargetProfile(integrationId: string, targetProfileId: string | null) {
    const integration = await this.prisma.integrationDefinition.findUnique({
      where: { id: integrationId },
      include: { workspace: { select: { id: true } } },
    });
    if (!integration) throw new NotFoundException(`Integration ${integrationId} not found`);

    let targetPin: Awaited<ReturnType<ProfilesService['resolvePinnedEffectiveProfile']>> = {
      effectiveProfileVersionId: null,
      schemaHash: null,
      updateStatus: 'UP_TO_DATE',
      impactLevel: 'NO_IMPACT',
    };

    if (targetProfileId) {
      const profile = await this.prisma.targetProfile.findUnique({
        where: { id: targetProfileId },
        select: { id: true, profileFamilyId: true },
      });
      if (!profile) throw new NotFoundException(`Target profile ${targetProfileId} not found`);
      targetPin = await this.profiles.resolvePinnedEffectiveProfile(
        integration.workspace.id,
        profile.profileFamilyId,
      );
    }

    return this.prisma.integrationDefinition.update({
      where: { id: integrationId },
      data: {
        targetProfileId,
        pinnedTargetEffectiveProfileVersionId: targetPin.effectiveProfileVersionId,
        targetSchemaHash: targetPin.schemaHash,
        targetProfileUpdateStatus: targetPin.updateStatus as any,
        targetProfileImpactLevel: targetPin.impactLevel as any,
      },
      include: {
        targetProfile: {
          select: { id: true, name: true, system: true, object: true, isPublished: true },
        },
      },
    });
  }

  /**
   * Generate Camel YAML for an integration using the shared @cogniviti/camel builder.
   * Writes the route file to the shared Docker volume so camel-runner can execute it.
   */
  async generateYaml(id: string) {
    const integration = await this.findOne(id);
    const ms = (integration as any).mappingSets?.[0];
    const rules = ms?.rules ?? [];

    const yaml = this.camel.generateRestToRestYaml({
      routeId: `${integration.id}`,
      description: `${integration.name}`,
      sourceBaseUrl: 'https://{{source.base-url}}',
      sourcePath: '{{source.path}}',
      targetBaseUrl: 'https://{{target.base-url}}',
      targetPath: '{{target.path}}',
      httpMethod: 'POST',
      fieldMappings: rules.map((r: any) => ({
        sourceField: r.sourceField,
        targetField: r.targetField,
        transformType: (r.transformConfig as any)?.type,
        transformConfig: r.transformConfig as Record<string, unknown>,
      })),
    });

    // Write the route file to the shared volume for camel-runner
    try {
      fs.mkdirSync(ROUTES_DIR, { recursive: true });
      const resolvedRoutesDir = path.resolve(ROUTES_DIR);
      const filePath = path.resolve(path.join(ROUTES_DIR, `${integration.id}.yaml`));
      if (!filePath.startsWith(resolvedRoutesDir + path.sep)) {
        throw new BadRequestException('Invalid integration ID for file path');
      }
      fs.writeFileSync(filePath, yaml, 'utf-8');
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      // Non-fatal: volume may not be mounted in local dev without Docker
    }

    return {
      integrationId: integration.id,
      mappingSetId: ms?.id ?? null,
      yaml,
    };
  }

  /**
   * Kick off an E2E test run asynchronously and return immediately with the testRunId.
   * The heavy processing (source fetch, mapping, validation, delivery) runs in background.
   */
  async startTestRun(
    id: string,
    opts: {
      dryRun?: boolean;
      step?: string;
      targetType?: 'JSON' | 'XML';
      targetName?: string;
      targetMode?: 'success' | 'error';
      simulatedResponse?: { statusCode?: number; body?: unknown; headers?: Record<string, string> };
    },
  ) {
    const integration = await this.prisma.integrationDefinition.findUnique({
      where: { id },
      include: {
        targetProfile: {
          include: {
            schemaPack: { include: { fields: { orderBy: { path: 'asc' } } } },
            fields: { orderBy: { sortOrder: 'asc' } },
            overlays: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
            currentVersion: true,
          },
        },
        mappingSets: {
          include: { rules: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${id} not found`);
    }

    const targetState = (integration.targetState as any) ?? {};

    const resolvedTargetType =
      opts.targetType ??
      (String(targetState?.targets?.[0]?.params?.find?.((p: any) => p?.key === 'demoTargetType')?.value ?? 'JSON').toUpperCase() === 'XML'
        ? 'XML'
        : 'JSON');
    const resolvedTargetName =
      opts.targetName ??
      String(targetState?.targets?.[0]?.params?.find?.((p: any) => p?.key === 'demoTargetName')?.value ?? 'primary-demo-target');

    const testRun = await this.prisma.integrationTestRun.create({
      data: {
        integrationDefId: id,
        status: 'RUNNING',
        sourceFetchStatus: 'PENDING',
        mappingStatus: 'PENDING',
        validationStatus: 'PENDING',
        targetDeliveryStatus: opts.dryRun ? 'SKIPPED' : 'PENDING',
        sourceConnectionId: integration.sourceConnectionId,
        targetConnectionId: integration.targetConnectionId,
        targetType: resolvedTargetType as any,
        targetName: resolvedTargetName,
        draftVersion: integration.draftVersion,
        sourceProfileEffectiveVersionId: integration.pinnedSourceEffectiveProfileVersionId,
        targetProfileEffectiveVersionId: integration.pinnedTargetEffectiveProfileVersionId,
        sourceSchemaHash: integration.sourceSchemaHash,
        targetSchemaHash: integration.targetSchemaHash,
        requestRef: `test-run:${id}:${Date.now()}`,
      },
    });

    // Fire-and-forget the heavy processing
    this.processTestRunBackground(id, testRun.id, integration, opts).catch((err) => {
      console.error(`Test run ${testRun.id} failed unexpectedly:`, err);
    });

    return { testRunId: testRun.id, status: 'running' };
  }

  /**
   * Poll for the status/result of a test run.
   */
  async getTestRunStatus(integrationId: string, testRunId: string) {
    const testRun = await this.prisma.integrationTestRun.findUnique({
      where: { id: testRunId },
    });

    if (!testRun || testRun.integrationDefId !== integrationId) {
      throw new NotFoundException(`Test run ${testRunId} not found`);
    }

    const isComplete = testRun.status === 'SUCCESS' || testRun.status === 'FAILED';

    // Separate hard errors from per-record validation warnings
    const allMessages = (testRun.validationErrors as string[] | null) ?? [];
    const validationWarnings = allMessages.filter((m) => m.startsWith('Record "'));
    const hardErrors = allMessages.filter((m) => !m.startsWith('Record "'));

    const isPartialValidation = testRun.validationStatus === 'PARTIAL';

    // Compute record counts from stored passed/failed payloads
    const passedPayload = testRun.passedPayloadJson as unknown[] | null;
    const failedPayload = testRun.failedPayloadJson as Array<{ record: Record<string, unknown>; errors: string[] }> | null;
    const passedCount = Array.isArray(passedPayload) ? passedPayload.length : 0;
    const failedCount = Array.isArray(failedPayload) ? failedPayload.length : 0;
    const totalRecords = passedCount + failedCount;

    const summary = isComplete
      ? (testRun.status === 'SUCCESS'
        ? (isPartialValidation
          ? `${passedCount} of ${totalRecords} records passed validation and delivered. ${failedCount} record(s) failed validation.`
          : `End-to-end test passed — source fetched, mapping/validation executed, and ${testRun.targetType} target responded successfully`)
        : testRun.normalizedErrorSummary ?? 'End-to-end test failed')
      : 'Test run in progress…';

    return {
      testRunId: testRun.id,
      status: isComplete ? (testRun.status === 'SUCCESS' ? 'success' : 'error') : 'running',
      summary,
      errors: hardErrors,
      warnings: validationWarnings,
      recordCounts: isComplete ? { total: totalRecords, passed: passedCount, failed: failedCount } : undefined,
      stages: {
        sourceFetchStatus: testRun.sourceFetchStatus,
        mappingStatus: testRun.mappingStatus,
        validationStatus: testRun.validationStatus,
        targetDeliveryStatus: testRun.targetDeliveryStatus,
      },
      payloads: isComplete ? {
        source: this.truncatePayloadForResponse(testRun.sourcePayload, 5),
        outboundJson: testRun.outboundPayloadJson,
        passedJson: passedPayload,
        failedJson: failedPayload,
        outboundRaw: null,
      } : undefined,
      targetResponse: isComplete ? {
        statusCode: testRun.targetResponseStatusCode,
        body: testRun.targetResponseBody,
        headers: testRun.targetResponseHeaders ?? {},
        targetType: testRun.targetType,
        targetName: testRun.targetName,
      } : undefined,
      context: {},
      driftSuggestionsCreated: 0,
    };
  }

  private async processTestRunBackground(
    id: string,
    testRunId: string,
    integration: any,
    opts: {
      dryRun?: boolean;
      step?: string;
      targetType?: 'JSON' | 'XML';
      targetName?: string;
      targetMode?: 'success' | 'error';
      simulatedResponse?: { statusCode?: number; body?: unknown; headers?: Record<string, string> };
    },
  ) {

    const errors: string[] = [];
    const warnings: string[] = [];
    const profile = integration.targetProfile;
    const ms = (integration as any).mappingSets?.[0];
    const mappingRules = ms?.rules ?? [];
    const sourceState = (integration.sourceState as any) ?? {};
    const targetState = (integration.targetState as any) ?? {};
    const validationState = (integration.validationState as any) ?? { rules: [] };

    const resolvedTargetType =
      opts.targetType ??
      (String(targetState?.targets?.[0]?.params?.find?.((p: any) => p?.key === 'demoTargetType')?.value ?? 'JSON').toUpperCase() === 'XML'
        ? 'XML'
        : 'JSON');
    const resolvedTargetName =
      opts.targetName ??
      String(targetState?.targets?.[0]?.params?.find?.((p: any) => p?.key === 'demoTargetName')?.value ?? 'primary-demo-target');
    const resolvedTargetMode = opts.targetMode ?? 'success';

    // Build effective field set from profile (lightweight inline resolution)
    let effectiveFields: { path: string; required: boolean }[] = [];
    let schemaHash: string | null = null;

    if (profile) {
      const fieldMap = new Map<string, { path: string; required: boolean }>();

      // Base fields from schema pack
      for (const f of profile.schemaPack.fields) {
        fieldMap.set(f.path, { path: f.path, required: f.required });
      }

      // Profile field overrides
      for (const f of profile.fields) {
        fieldMap.set(f.path, { path: f.path, required: f.required });
      }

      effectiveFields = Array.from(fieldMap.values());

      // Compute hash of effective field paths + requiredness for drift traceability
      const hashInput = effectiveFields
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((f) => `${f.path}:${f.required}`)
        .join('|');
      schemaHash = crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 16);
    }

    // Validate required fields are mapped
    const mappedTargets = new Set(mappingRules.map((r: any) => r.targetField as string));
    const unmappedRequired = effectiveFields.filter(
      (f) => f.required && !mappedTargets.has(f.path),
    );

    if (unmappedRequired.length > 0) {
      errors.push(
        ...unmappedRequired.map((f) => `Required field unmapped: ${f.path}`),
      );
    }

    // Check for duplicate target mappings
    const targetCounts: Record<string, number> = {};
    for (const r of mappingRules) {
      const tf = (r as any).targetField as string;
      targetCounts[tf] = (targetCounts[tf] ?? 0) + 1;
    }
    for (const [field, count] of Object.entries(targetCounts)) {
      if (count > 1) errors.push(`Duplicate target mapping: ${field}`);
    }

    // Build traceability context
    const context = {
      targetProfileId: profile?.id ?? null,
      publishedVersionId: profile?.currentVersion?.id ?? null,
      publishedVersion: profile?.currentVersion?.version ?? null,
      sourceProfileEffectiveVersionId: integration.pinnedSourceEffectiveProfileVersionId ?? null,
      targetProfileEffectiveVersionId: integration.pinnedTargetEffectiveProfileVersionId ?? null,
      effectiveSchemaHash: schemaHash,
      effectiveFieldCount: effectiveFields.length,
      effectiveRequiredCount: effectiveFields.filter((f) => f.required).length,
      mappingRuleCount: mappingRules.length,
      dryRun: opts.dryRun ?? true,
      targetType: resolvedTargetType,
      targetName: resolvedTargetName,
      targetMode: resolvedTargetMode,
      step: opts.step ?? null,
      timestamp: new Date().toISOString(),
    };

    const requestRef = `test-run:${id}:${Date.now()}`;

    let sourcePayload: unknown = null;
    let mappedPayload: Record<string, unknown> | Record<string, unknown>[] = {};
    let outboundPayloadRaw: string | null = null;
    let sourceFetchStatus = 'FAILED';
    let mappingStatus = 'FAILED';
    let validationStatus = 'FAILED';
    let targetDeliveryStatus = opts.dryRun ? 'SKIPPED' : 'FAILED';
    let targetResponseStatusCode: number | null = null;
    let targetResponseBody: string | null = null;
    let targetResponseHeaders: Record<string, string> = {};
    let passedRecords: Record<string, unknown>[] = [];
    let failedRecordEntries: { record: Record<string, unknown>; errors: string[] }[] = [];

    try {
      const sourceResult = await this.fetchLiveSourcePayload(integration);
      sourcePayload = sourceResult.payload;
      sourceFetchStatus = 'SUCCESS';

      const sourceRecords = this.unwrapAllSourceRecords(sourceResult.payload);
      if (sourceRecords.length === 0) {
        throw new Error('Source returned no records to process');
      }

      const fieldMappings = mappingRules.map((rule: any) => ({
        sourceField: String(rule.sourceField ?? ''),
        targetField: String(rule.targetField ?? ''),
        transformType: String((rule.transformConfig as any)?.type ?? '').trim() || undefined,
        transformConfig: this.readJsonObject(rule.transformConfig),
      }));

      // Map each source record individually
      const mappedRecords: Record<string, unknown>[] = [];
      for (const sourceRecord of sourceRecords) {
        let mapped: Record<string, unknown> | null = null;
        try {
          mapped = await this.camel.runMappingPreview({
            sourcePayload: sourceRecord,
            fieldMappings,
          });
          // Validate Camel output — reject if it returned literal expressions or Java-style stringified objects
          if (mapped && this.isCamelOutputGarbage(mapped)) {
            mapped = this.runJsDirectMappingFallback(sourceRecord, mappingRules);
          }
        } catch {
          mapped = this.runJsDirectMappingFallback(sourceRecord, mappingRules);
        }
        if (mapped) {
          mappedRecords.push(mapped);
        }
      }

      if (mappedRecords.length === 0) {
        throw new Error('Mapping execution failed — no records were successfully mapped');
      }

      mappingStatus = 'SUCCESS';

      // Validate each mapped record — split into passed / failed

      for (const record of mappedRecords) {
        const validationResult = this.executeValidation(record, validationState);
        if (validationResult.warnings.length > 0) {
          warnings.push(...validationResult.warnings);
        }
        if (validationResult.errors.length > 0) {
          failedRecordEntries.push({ record, errors: validationResult.errors });
        } else {
          passedRecords.push(record);
        }
      }

      // Report failed records as errors (include identifying info)
      for (const f of failedRecordEntries) {
        const identifier =
          (f.record['invoice-number'] as string) ??
          (f.record['id'] as string) ??
          'unknown';
        for (const e of f.errors) {
          errors.push(`Record "${identifier}": ${e}`);
        }
      }

      // Use passed records for delivery (all mapped records still stored for preview)
      mappedPayload = mappedRecords.length === 1 ? mappedRecords[0] : mappedRecords;
      const deliverablePayload = passedRecords.length === 1 ? passedRecords[0] : passedRecords;

      if (failedRecordEntries.length === 0) {
        validationStatus = 'SUCCESS';
      } else if (passedRecords.length > 0) {
        validationStatus = 'PARTIAL';
      } else {
        validationStatus = 'FAILED';
      }

      // Deliver passed records to target (even if some records failed validation)
      if (!opts.dryRun && passedRecords.length > 0) {
        if (resolvedTargetType === 'JSON') {
          outboundPayloadRaw = JSON.stringify(deliverablePayload);
        } else {
          outboundPayloadRaw = this.objectToXml(deliverablePayload, 'payload');
        }

        const delivery = await this.deliverToDemoTarget({
          targetType: resolvedTargetType,
          targetName: resolvedTargetName,
          targetMode: resolvedTargetMode,
          integrationId: id,
          testRunId,
          draftVersion: integration.draftVersion,
          sourceProfileEffectiveVersionId: integration.pinnedSourceEffectiveProfileVersionId,
          targetProfileEffectiveVersionId: integration.pinnedTargetEffectiveProfileVersionId,
          sourceSchemaHash: integration.sourceSchemaHash,
          targetSchemaHash: integration.targetSchemaHash,
          payloadJson: deliverablePayload,
          payloadRaw: outboundPayloadRaw,
        });

        targetResponseStatusCode = delivery.statusCode;
        targetResponseBody = delivery.body;
        targetResponseHeaders = delivery.headers;
        targetDeliveryStatus = delivery.statusCode >= 200 && delivery.statusCode < 300 ? 'SUCCESS' : 'FAILED';

        if (targetDeliveryStatus === 'FAILED') {
          errors.push(`Target delivery failed: HTTP ${delivery.statusCode}`);
        }
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : 'Test run failed unexpectedly');
    }

    // If a simulated target response is provided, run it through drift detection
    let driftResult: { suggestionsCreated: number } | null = null;
    if (opts.simulatedResponse && profile?.id) {
      try {
        driftResult = await this.driftDetection.processRuntimeErrors({
          targetProfileId: profile.id,
          rawResponse: opts.simulatedResponse,
          environment: 'TEST',
          requestRef,
          responseRef: `test-run-response:${id}:${context.timestamp}`,
          sourceRunRef: `test-run:${testRunId}`,
        });
      } catch {
        // Drift processing is non-blocking — log but don't fail the test run
      }
    }

    // Determine overall test status:
    // - "success" if all records passed or at least some were delivered
    // - "error" only if no records could be delivered (total validation failure, source fail, etc.)
    const hasDelivery = targetDeliveryStatus === 'SUCCESS';
    const hasPartialValidation = validationStatus === 'PARTIAL';
    const testStatus = (hasDelivery || (validationStatus === 'SUCCESS' && opts.dryRun))
      ? 'success'
      : 'error';

    // Move per-record validation failures to warnings when delivery succeeded
    const validationWarnings: string[] = [];
    const hardErrors: string[] = [];
    if (hasDelivery || hasPartialValidation) {
      for (const e of errors) {
        if (e.startsWith('Record "')) {
          validationWarnings.push(e);
        } else {
          hardErrors.push(e);
        }
      }
    } else {
      hardErrors.push(...errors);
    }

    const allMessages = [...hardErrors, ...validationWarnings];
    const normalizedErrorSummary =
      allMessages.length === 0
        ? null
        : allMessages.length === 1
        ? allMessages[0]
        : `${allMessages[0]} (+${allMessages.length - 1} more)`;

    await this.prisma.integrationTestRun.update({
      where: { id: testRunId },
      data: {
        status: testStatus === 'success' ? 'SUCCESS' : 'FAILED',
        sourceFetchStatus,
        mappingStatus,
        validationStatus,
        targetDeliveryStatus,
        sourcePayload: (sourcePayload ?? null) as any,
        outboundPayloadJson: (mappedPayload ?? null) as any,
        outboundPayloadRaw,
        passedPayloadJson: (passedRecords.length > 0 ? passedRecords : null) as any,
        failedPayloadJson: (failedRecordEntries.length > 0
          ? failedRecordEntries.map(f => ({ record: f.record, errors: f.errors }))
          : null) as any,
        validationErrors: allMessages as any,
        normalizedErrorSummary,
        targetResponseStatusCode,
        targetResponseBody,
        targetResponseHeaders: targetResponseHeaders as any,
        responseRef:
          targetResponseStatusCode != null
            ? `test-run-response:${testRunId}:${Date.now()}`
            : null,
      },
    });

    // Persist test status for readiness computation
    await this.prisma.integrationDefinition
      .update({
        where: { id },
        data: { lastTestStatus: testStatus, lastTestAt: new Date() },
      })
      .catch(() => {
        /* non-blocking */
      });

  }

  async previewPayloads(id: string) {
    const integration = await this.prisma.integrationDefinition.findUnique({
      where: { id },
      include: {
        mappingSets: {
          include: { rules: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${id} not found`);
    }

    let sourceResult: { payload: unknown } | null = null;
    let sourceError: string | null = null;
    try {
      sourceResult = await this.fetchLiveSourcePayload(integration);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown source preview failure';
      sourceError = `Preview source fetch failed: ${message}`;
    }

    const previewSource = sourceResult ? this.unwrapPreviewSourceRecord(sourceResult.payload) : null;
    const latestSet = (integration as any).mappingSets?.[0];
    const mappingRules = latestSet?.rules ?? [];
    let targetPayload: Record<string, unknown> | null = null;
    let targetError: string | null = null;

    if (previewSource) {
      try {
        targetPayload = await this.camel.runMappingPreview({
          sourcePayload: previewSource,
          fieldMappings: mappingRules.map((rule: any) => ({
            sourceField: String(rule.sourceField ?? ''),
            targetField: String(rule.targetField ?? ''),
            transformType: String((rule.transformConfig as any)?.type ?? '').trim() || undefined,
            transformConfig: this.readJsonObject(rule.transformConfig),
          })),
        });
        // Validate Camel output — reject if it returned literal expressions or Java-style stringified objects
        if (targetPayload && this.isCamelOutputGarbage(targetPayload)) {
          targetPayload = this.runJsDirectMappingFallback(previewSource, mappingRules);
        }
      } catch (error) {
        // Camel-runner unavailable — fall back to JS-based direct mapping
        targetPayload = this.runJsDirectMappingFallback(previewSource, mappingRules);
        if (targetPayload) {
          targetError = null; // fallback succeeded, suppress the error
        } else {
          const message = error instanceof Error ? error.message : 'Unknown Camel preview failure';
          targetError = `Preview mapping execution failed in camel-runner: ${message}`;
        }
      }
    } else {
      targetError = sourceError ? 'Preview target output unavailable because source fetch failed.' : null;
    }

    return {
      sourcePayload: previewSource,
      targetPayload,
      sourceError,
      targetError,
      mappingSetId: latestSet?.id ?? null,
      mappingVersion: latestSet?.version ?? null,
      mappingRuleCount: mappingRules.length,
    };
  }

  private async fetchLiveSourcePayload(integration: any): Promise<{ payload: unknown }> {
    const sourceState = (integration.sourceState as any) ?? {};
    const sourceConnectionId =
      integration.sourceConnectionId ?? sourceState?.primary?.connectionId ?? null;

    if (!sourceConnectionId) {
      throw new BadRequestException('No source connection configured for this integration');
    }

    const connection = await this.prisma.connectionDefinition.findUnique({ where: { id: sourceConnectionId } });
    if (!connection) {
      throw new NotFoundException(`Source connection ${sourceConnectionId} not found`);
    }

    if (connection.family !== 'REST_OPENAPI') {
      throw new BadRequestException('Demo run currently supports REST/OpenAPI source connections only');
    }

    const config = this.readJsonObject(connection.config);
    const baseUrl = this.readNonEmptyString(config.baseUrl);
    if (!baseUrl) {
      throw new BadRequestException('Source connection baseUrl is missing');
    }

    const endpointPath =
      this.readNonEmptyString(sourceState?.primary?.endpointPath) ??
      this.readNonEmptyString(config.testPath) ??
      '/';
    const sourceMethod =
      (this.readNonEmptyString(sourceState?.primary?.operation) ??
        this.readNonEmptyString(config.testMethod) ??
        'GET')
        .toUpperCase();

    const url = new URL(endpointPath.startsWith('/') ? `${baseUrl}${endpointPath}` : `${baseUrl}/${endpointPath}`);
    const queryParams = Array.isArray(sourceState?.primary?.queryParams)
      ? sourceState.primary.queryParams
      : [];
    for (const item of queryParams) {
      if (item && typeof item.key === 'string' && item.key.trim().length > 0) {
        url.searchParams.set(item.key, String(item.value ?? ''));
      }
    }

    const headers: Record<string, string> = {
      accept: 'application/json',
    };

    const configuredHeaders = Array.isArray(sourceState?.primary?.headers)
      ? sourceState.primary.headers
      : [];
    for (const item of configuredHeaders) {
      if (item && typeof item.key === 'string' && item.key.trim().length > 0) {
        headers[item.key.trim()] = String(item.value ?? '');
      }
    }

    await this.applyRestAuthHeaders(config, headers, url);

    const timeoutMs = Number(config.timeoutMs ?? 15000);
    let response: Response;
    try {
      response = await fetch(url.toString(), {
        method: sourceMethod,
        headers,
        signal: AbortSignal.timeout(Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new GatewayTimeoutException(`Source fetch timed out after ${Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15000}ms for ${sourceMethod} ${url.toString()}`);
      }
      throw new BadGatewayException(`Source fetch request failed for ${sourceMethod} ${url.toString()}: ${error instanceof Error ? error.message : 'Unknown fetch error'}`);
    }

    const text = await response.text();
    if (!response.ok) {
      throw new BadRequestException(`Source fetch failed: HTTP ${response.status} ${text.slice(0, 160)}`);
    }

    const payload = this.parseResponseBody(text, response.headers.get('content-type'));
    return { payload };
  }

  private unwrapPreviewSourceRecord(payload: unknown): Record<string, unknown> {
    const all = this.unwrapAllSourceRecords(payload);
    return all[0] ?? {};
  }

  /**
   * Extract ALL records from a source payload.
   * Handles: bare arrays, and objects with common wrapper keys (items, records, results, data, value).
   */
  private unwrapAllSourceRecords(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) {
      return payload.filter((r) => r && typeof r === 'object' && !Array.isArray(r)) as Record<string, unknown>[];
    }

    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      for (const key of ['items', 'records', 'results', 'data', 'value']) {
        const candidate = record[key];
        if (Array.isArray(candidate)) {
          const records = candidate.filter((r) => r && typeof r === 'object' && !Array.isArray(r)) as Record<string, unknown>[];
          if (records.length > 0) return records;
        }
      }
      return [record];
    }

    return [];
  }

  private executeMapping(sourcePayload: unknown, mappingRules: Array<{ sourceField: string; targetField: string; mappingType?: string; transformConfig?: unknown }>): Record<string, unknown> {
    const output: Record<string, unknown> = {};

    // Separate flat rules from array-wildcard rules (target contains [*])
    const flatRules: typeof mappingRules = [];
    const arrayGroups = new Map<string, Array<{ sourceArrayPath: string; sourceSubPath: string; targetSubPath: string; rule: (typeof mappingRules)[0] }>>();

    for (const rule of mappingRules) {
      if (!rule?.targetField) continue;
      const tMatch = rule.targetField.match(/^(.+?)\[\*\]\.(.+)$/);
      if (tMatch) {
        const targetArrayPath = tMatch[1];
        const targetSubPath = tMatch[2];
        const sMatch = rule.sourceField?.match(/^(.+?)\[\*\]\.(.+)$/);
        const sourceArrayPath = sMatch ? sMatch[1] : targetArrayPath;
        const sourceSubPath = sMatch ? sMatch[2] : rule.sourceField;
        if (!arrayGroups.has(targetArrayPath)) arrayGroups.set(targetArrayPath, []);
        arrayGroups.get(targetArrayPath)!.push({ sourceArrayPath, sourceSubPath, targetSubPath, rule });
      } else {
        flatRules.push(rule);
      }
    }

    // Apply flat (header-level) rules
    for (const rule of flatRules) {
      const mappingType = String(rule.mappingType ?? 'DIRECT').toUpperCase();
      const transform = this.readJsonObject(rule.transformConfig);
      let value: unknown;
      if (mappingType === 'CONSTANT') {
        value = transform.value ?? transform.constant ?? '';
      } else {
        value = this.getValueByPath(sourcePayload, rule.sourceField);
      }
      value = this.applyTransform(value, transform, sourcePayload, rule.sourceField);
      this.setValueByPath(output, rule.targetField, value);
    }

    // Apply array-wildcard rules — iterate source array, build target array
    for (const [targetArrayPath, group] of arrayGroups) {
      const sourceArrayPath = group[0].sourceArrayPath;
      const sourceArray = this.getValueByPath(sourcePayload, sourceArrayPath);
      if (!Array.isArray(sourceArray)) continue;

      const targetArray: Record<string, unknown>[] = [];
      for (const sourceItem of sourceArray) {
        const targetItem: Record<string, unknown> = {};
        for (const g of group) {
          const mappingType = String(g.rule.mappingType ?? 'DIRECT').toUpperCase();
          const transform = this.readJsonObject(g.rule.transformConfig);
          let value: unknown;
          if (mappingType === 'CONSTANT') {
            value = transform.value ?? transform.constant ?? '';
          } else {
            value = this.getValueByPath(sourceItem, g.sourceSubPath);
          }
          value = this.applyTransform(value, transform, sourceItem as any, g.sourceSubPath);
          this.setValueByPath(targetItem, g.targetSubPath, value);
        }
        targetArray.push(targetItem);
      }
      this.setValueByPath(output, targetArrayPath, targetArray);
    }

    return output;
  }

  private executeValidation(
    mappedPayload: Record<string, unknown>,
    validationState: {
      rules?: Array<{
        name?: string;
        field?: string;
        operator?: string;
        value?: string | string[];
        condition?: string;
        severity?: string;
        enabled?: boolean;
      }>;
    },
  ) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const rules = Array.isArray(validationState?.rules) ? validationState.rules : [];

    for (const rule of rules) {
      if (!rule || rule.enabled === false) continue;

      let passed = false;
      let fieldPath = rule.field ?? '';

      // New structured format (field + operator + value)
      if (rule.field && rule.operator) {
        const fieldValue = this.getValueByPath(mappedPayload, rule.field);
        const ruleValue = Array.isArray(rule.value) ? rule.value : String(rule.value ?? '');

        switch (rule.operator) {
          case 'IS_NOT_EMPTY':
            passed = fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
            break;
          case 'EQUALS':
            passed = String(fieldValue) === String(ruleValue);
            break;
          case 'NOT_EQUALS':
            passed = String(fieldValue) !== String(ruleValue);
            break;
          case 'GREATER_THAN':
            passed = Number(fieldValue) > Number(ruleValue);
            break;
          case 'LESS_THAN':
            passed = Number(fieldValue) < Number(ruleValue);
            break;
          case 'IN': {
            const list = Array.isArray(ruleValue) ? ruleValue : String(ruleValue).split(',').map((s) => s.trim());
            passed = list.includes(String(fieldValue));
            break;
          }
          case 'NOT_IN': {
            const list = Array.isArray(ruleValue) ? ruleValue : String(ruleValue).split(',').map((s) => s.trim());
            passed = !list.includes(String(fieldValue));
            break;
          }
          case 'MATCHES':
            try { passed = new RegExp(String(ruleValue)).test(String(fieldValue ?? '')); } catch { passed = false; }
            break;
          case 'LENGTH_MIN':
            passed = String(fieldValue ?? '').length >= Number(ruleValue);
            break;
          case 'LENGTH_MAX':
            passed = String(fieldValue ?? '').length <= Number(ruleValue);
            break;
          default:
            passed = true;
        }
      } else if (rule.condition) {
        // Legacy condition format fallback
        const match = String(rule.condition).match(/^record\.(\w[\w.]*)\s*(>|<|>=|<=|===|!==|==|!=)\s*(.+)$/);
        if (!match) continue;
        const [, legacyPath, op, rawVal] = match;
        fieldPath = legacyPath;
        const fieldValue = this.getValueByPath(mappedPayload, legacyPath);
        const compareValueRaw = rawVal.trim().replace(/^['\"]|['\"]$/g, '');
        const compareNumber = Number(compareValueRaw);
        const useNumber = !Number.isNaN(compareNumber) && typeof fieldValue === 'number';
        switch (op) {
          case '>': passed = useNumber ? (fieldValue as number) > compareNumber : String(fieldValue) > compareValueRaw; break;
          case '<': passed = useNumber ? (fieldValue as number) < compareNumber : String(fieldValue) < compareValueRaw; break;
          case '>=': passed = useNumber ? (fieldValue as number) >= compareNumber : String(fieldValue) >= compareValueRaw; break;
          case '<=': passed = useNumber ? (fieldValue as number) <= compareNumber : String(fieldValue) <= compareValueRaw; break;
          case '===': case '==': passed = useNumber ? fieldValue === compareNumber : String(fieldValue) === compareValueRaw; break;
          case '!==': case '!=': passed = useNumber ? fieldValue !== compareNumber : String(fieldValue) !== compareValueRaw; break;
        }
      } else {
        continue;
      }

      if (!passed) {
        const label = rule.name?.trim() ? rule.name.trim() : `Rule on ${fieldPath}`;
        const message = `${label} failed: ${fieldPath} ${rule.operator ?? 'check'}`;
        if (String(rule.severity ?? 'Error').toLowerCase() === 'warning') {
          warnings.push(message);
        } else {
          errors.push(message);
        }
      }
    }

    return { errors, warnings };
  }

  private async deliverToDemoTarget(params: {
    targetType: 'JSON' | 'XML';
    targetName: string;
    targetMode: 'success' | 'error';
    integrationId: string;
    testRunId: string;
    draftVersion: number;
    sourceProfileEffectiveVersionId: string | null;
    targetProfileEffectiveVersionId: string | null;
    sourceSchemaHash: string | null;
    targetSchemaHash: string | null;
    payloadJson: Record<string, unknown> | Record<string, unknown>[];
    payloadRaw: string | null;
  }): Promise<{ statusCode: number; body: string; headers: Record<string, string> }> {
    const baseUrl = process.env.INTERNAL_API_BASE_URL ?? `http://localhost:${process.env.PORT ?? '4000'}`;
    const pathPart = params.targetType === 'XML' ? 'xml' : 'json';
    const url = `${baseUrl}/demo-targets/${pathPart}/${encodeURIComponent(params.targetName)}?mode=${params.targetMode}`;

    const authSecret = process.env.AUTH_STUB_SECRET ?? '';
    const headers: Record<string, string> = {
      'x-integration-id': params.integrationId,
      'x-test-run-id': params.testRunId,
      'x-draft-version': String(params.draftVersion),
      'x-source-profile-effective-version-id': params.sourceProfileEffectiveVersionId ?? '',
      'x-target-profile-effective-version-id': params.targetProfileEffectiveVersionId ?? '',
      'x-source-schema-hash': params.sourceSchemaHash ?? '',
      'x-target-schema-hash': params.targetSchemaHash ?? '',
      'x-user-id': 'system-stub-user',
      'x-user-role': 'ADMIN',
    };

    if (authSecret) {
      headers.authorization = `Bearer ${authSecret}`;
    }

    if (params.targetType === 'XML') {
      headers['content-type'] = 'application/xml';
    } else {
      headers['content-type'] = 'application/json';
    }

    const body = params.targetType === 'XML' ? params.payloadRaw ?? '<payload />' : JSON.stringify(params.payloadJson);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    const text = await response.text();
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    return {
      statusCode: response.status,
      body: text,
      headers: responseHeaders,
    };
  }

  private async applyRestAuthHeaders(
    config: Record<string, unknown>,
    headers: Record<string, string>,
    url: URL,
  ): Promise<void> {
    const authMethod = String(config.authMethod ?? 'None');

    if (authMethod === 'Bearer Token') {
      const token = this.readNonEmptyString(config.bearerTokenRef) ?? this.readNonEmptyString(config.bearerToken);
      if (token) {
        headers.authorization = `Bearer ${token}`;
      }
      return;
    }

    if (authMethod === 'Basic') {
      const username = this.readNonEmptyString(config.basicUsername);
      const password = this.readNonEmptyString(config.basicPasswordRef) ?? this.readNonEmptyString(config.basicPassword);
      if (username && password) {
        headers.authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      }
      return;
    }

    if (authMethod === 'API Key') {
      const keyName = this.readNonEmptyString(config.apiKeyName);
      const keyValue = this.readNonEmptyString(config.apiKeyValueRef) ?? this.readNonEmptyString(config.apiKeyValue);
      const placement = String(config.apiKeyPlacement ?? 'Header').toLowerCase();
      if (keyName && keyValue) {
        if (placement === 'query') {
          url.searchParams.set(keyName, keyValue);
        } else {
          headers[keyName] = keyValue;
        }
      }
      return;
    }

    if (authMethod === 'OAuth 2.0') {
      const clientId = this.readNonEmptyString(config.oauthClientId);
      const clientSecret =
        this.readNonEmptyString(config.oauthClientSecretRef) ??
        this.readNonEmptyString(config.oauthClientSecret);
      const tokenEndpoint = this.readNonEmptyString(config.oauthTokenEndpoint);
      if (clientId && clientSecret && tokenEndpoint) {
        const body = new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        });
        const scope = this.readNonEmptyString(config.oauthScope);
        if (scope) body.set('scope', scope);
        const resource = this.readNonEmptyString(config.oauthResourceIndicator);
        if (resource) body.set('resource', resource);
        try {
          const tokenRes = await fetch(tokenEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
            body: body.toString(),
          });
          if (tokenRes.ok) {
            const tokenData = (await tokenRes.json()) as { access_token?: string };
            if (tokenData.access_token) {
              headers.authorization = `Bearer ${tokenData.access_token}`;
            }
          }
        } catch {
          // Token fetch failure is non-fatal here — the source request will return 401 with a clearer message
        }
      }
      return;
    }
  }

  private parseResponseBody(text: string, contentType: string | null): unknown {
    if (!text) return {};
    if (contentType && contentType.toLowerCase().includes('json')) {
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    }
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  }

  /**
   * Detect when Camel runner returns status "completed" but the mapped payload
   * contains unevaluated expressions or Java HashMap.toString() stringified objects.
   */
  private isCamelOutputGarbage(mapped: Record<string, unknown>): boolean {
    const values = Object.values(mapped);
    for (const v of values) {
      if (typeof v !== 'string') continue;
      // Java HashMap.toString() pattern: {key=val, key2=val2}
      if (/^\{[a-z][\w-]+=/.test(v) && v.includes(', ')) return true;
      // Literal Camel simple-language expressions leaked through: "val == null ? null : val.toUpperCase()"
      if (/== null \? null :.*\.(toUpperCase|toLowerCase|trim)\(\)/.test(v)) return true;
    }
    return false;
  }

  /**
   * Lightweight JS-based mapping fallback when camel-runner is unavailable.
   * Handles DIRECT mappings and simple transforms without needing JBang/Camel.
   */
  private runJsDirectMappingFallback(
    sourcePayload: Record<string, unknown>,
    mappingRules: any[],
  ): Record<string, unknown> | null {
    try {
      const target: Record<string, unknown> = {};

      // Separate flat rules from array-wildcard rules (target contains [*])
      const flatRules: any[] = [];
      const arrayGroups = new Map<string, Array<{ sourceArrayPath: string; sourceSubPath: string; targetSubPath: string; rule: any }>>();

      for (const rule of mappingRules) {
        const sourceField = String(rule.sourceField ?? '');
        const targetField = String(rule.targetField ?? '');
        if (!sourceField || !targetField) continue;
        const tMatch = targetField.match(/^(.+?)\[\*\]\.(.+)$/);
        if (tMatch) {
          const targetArrayPath = tMatch[1];
          const targetSubPath = tMatch[2];
          const sMatch = sourceField.match(/^(.+?)\[\*\]\.(.+)$/);
          const sourceArrayPath = sMatch ? sMatch[1] : targetArrayPath;
          const sourceSubPath = sMatch ? sMatch[2] : sourceField;
          if (!arrayGroups.has(targetArrayPath)) arrayGroups.set(targetArrayPath, []);
          arrayGroups.get(targetArrayPath)!.push({ sourceArrayPath, sourceSubPath, targetSubPath, rule });
        } else {
          flatRules.push(rule);
        }
      }

      // Apply flat (header-level) rules
      for (const rule of flatRules) {
        const sourceField = String(rule.sourceField ?? '');
        const targetField = String(rule.targetField ?? '');
        let value = this.getValueByPath(sourcePayload, sourceField);
        // If the resolved value is a non-array object, extract a sensible scalar
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          const obj = value as Record<string, unknown>;
          value = obj.code ?? obj.name ?? obj.value ?? obj.id ?? JSON.stringify(value);
        }
        const transformConfig = this.readJsonObject(rule.transformConfig);
        if (Object.keys(transformConfig).length > 0) {
          value = this.applyTransform(value, transformConfig, sourcePayload, sourceField);
        }
        this.setValueByPath(target, targetField, value);
      }

      // Apply array-wildcard rules — iterate source array, build target array
      for (const [targetArrayPath, group] of arrayGroups) {
        const sourceArrayPath = group[0].sourceArrayPath;
        const sourceArray = this.getValueByPath(sourcePayload, sourceArrayPath);
        if (!Array.isArray(sourceArray)) continue;

        const targetArray: Record<string, unknown>[] = [];
        for (const sourceItem of sourceArray) {
          const targetItem: Record<string, unknown> = {};
          for (const g of group) {
            let value = this.getValueByPath(sourceItem, g.sourceSubPath);
            // If the resolved value is a non-array object, extract a sensible scalar
            if (value && typeof value === 'object' && !Array.isArray(value)) {
              const obj = value as Record<string, unknown>;
              value = obj.code ?? obj.name ?? obj.value ?? obj.id ?? JSON.stringify(value);
            }
            const transformConfig = this.readJsonObject(g.rule.transformConfig);
            if (Object.keys(transformConfig).length > 0) {
              value = this.applyTransform(value, transformConfig, sourceItem as any, g.sourceSubPath);
            }
            this.setValueByPath(targetItem, g.targetSubPath, value);
          }
          targetArray.push(targetItem);
        }
        this.setValueByPath(target, targetArrayPath, targetArray);
      }

      return target;
    } catch {
      return null;
    }
  }

  private readJsonObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private readNonEmptyString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return null;
  }

  /**
   * Truncate a large source payload for the HTTP response.
   * Keeps only the first `maxRecords` records to avoid multi-MB responses.
   */
  private truncatePayloadForResponse(payload: unknown, maxRecords: number): unknown {
    if (payload == null) return null;
    if (Array.isArray(payload)) {
      const truncated = payload.slice(0, maxRecords);
      if (payload.length > maxRecords) {
        return { _preview: true, _totalRecords: payload.length, _shownRecords: maxRecords, records: truncated };
      }
      return truncated;
    }
    // If the payload is a wrapper object with an array property, truncate the largest array
    if (typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      for (const key of Object.keys(obj)) {
        if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > maxRecords) {
          return {
            ...obj,
            [key]: (obj[key] as unknown[]).slice(0, maxRecords),
            _preview: true,
            _totalRecords: (obj[key] as unknown[]).length,
            _shownRecords: maxRecords,
          };
        }
      }
    }
    return payload;
  }

  private getValueByPath(input: unknown, pathValue: string): unknown {
    if (!pathValue) return null;
    if (input && typeof input === 'object') {
      const record = input as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(record, pathValue)) {
        return record[pathValue];
      }
    }

    const normalizedPath = pathValue.replace(/\[\*\]/g, '.0').replace(/\[(\d+)\]/g, '.$1');
    return pathValue.split('.').reduce((acc: any, key: string) => {
      if (acc == null || typeof acc !== 'object') return null;
      return acc[key];
    }, input as any) ?? normalizedPath.split('.').reduce((acc: any, key: string) => {
      if (acc == null || typeof acc !== 'object') return null;
      return acc[key];
    }, input as any);
  }

  private setValueByPath(target: Record<string, unknown>, pathValue: string, value: unknown) {
    const keys = pathValue.split('.').filter(Boolean);
    if (keys.length === 0) return;
    let cursor: Record<string, unknown> = target;
    for (let i = 0; i < keys.length - 1; i += 1) {
      const key = keys[i];
      const current = cursor[key];
      if (!current || typeof current !== 'object' || Array.isArray(current)) {
        cursor[key] = {};
      }
      cursor = cursor[key] as Record<string, unknown>;
    }
    cursor[keys[keys.length - 1]] = value;
  }

  private applyTransform(
    value: unknown,
    transformConfig: Record<string, unknown>,
    sourcePayload: unknown,
    sourceField: string,
  ): unknown {
    const kind = String(transformConfig.type ?? '').toLowerCase();
    if (!kind) return value;

    if (kind === 'uppercase') return value == null ? value : String(value).toUpperCase();
    if (kind === 'lowercase') return value == null ? value : String(value).toLowerCase();
    if (kind === 'trim') return value == null ? value : String(value).trim();
    if (kind === 'constant') return transformConfig.value ?? value;

    if (kind === 'lookup') {
      const table = this.readJsonObject(transformConfig.table);
      const lookupKey = value == null ? '' : String(value);
      if (Object.prototype.hasOwnProperty.call(table, lookupKey)) {
        return table[lookupKey];
      }
      return value;
    }

    if (kind === 'concat') {
      const separator = this.readNonEmptyString(transformConfig.separator) ?? ' ';
      const configuredFields = Array.isArray(transformConfig.sourceFields)
        ? transformConfig.sourceFields.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
        : [];
      const fields = configuredFields.length > 0 ? configuredFields : [sourceField];
      const parts = fields
        .map((path) => this.getValueByPath(sourcePayload, path))
        .filter((item) => item != null && String(item).length > 0)
        .map((item) => String(item));
      return parts.join(separator);
    }

    if (kind === 'dateformat') {
      const fromFormat = this.readNonEmptyString(transformConfig.fromFormat) ?? 'YYYY-MM-DD';
      const toFormat = this.readNonEmptyString(transformConfig.toFormat) ?? 'YYYY-MM-DD';
      return this.convertDateFormat(value, fromFormat, toFormat);
    }

    if (kind === 'formula' || kind === 'conditional') {
      const expression = this.readNonEmptyString(transformConfig.expression);
      if (!expression) return value;
      return this.evaluateExpression(expression, value, sourcePayload);
    }

    return value;
  }

  private convertDateFormat(value: unknown, fromFormat: string, toFormat: string): unknown {
    if (value == null) return value;
    const raw = String(value).trim();
    if (!raw) return raw;

    const parse = (input: string, format: string): { y: string; m: string; d: string } | null => {
      const normalized = format.toUpperCase();
      const tokenRegex = normalized
        .replace('YYYY', '(?<y>\\d{4})')
        .replace('MM', '(?<m>\\d{1,2})')
        .replace('DD', '(?<d>\\d{1,2})');
      const regex = new RegExp(`^${tokenRegex}$`);
      const match = input.match(regex);
      if (!match?.groups?.y || !match?.groups?.m || !match?.groups?.d) return null;
      const mm = match.groups.m.padStart(2, '0');
      const dd = match.groups.d.padStart(2, '0');
      return { y: match.groups.y, m: mm, d: dd };
    };

    const parsed = parse(raw, fromFormat);
    if (!parsed) return value;

    return toFormat
      .replace(/YYYY/gi, parsed.y)
      .replace(/MM/gi, parsed.m)
      .replace(/DD/gi, parsed.d);
  }

  private evaluateExpression(expression: string, value: unknown, sourcePayload: unknown): unknown {
    try {
      const fn = new Function('value', 'record', `return (${expression});`);
      return fn(value, sourcePayload);
    } catch {
      return value;
    }
  }

  private objectToXml(value: unknown, rootName: string): string {
    const body = this.objectToXmlInner(value);
    return `<${rootName}>${body}</${rootName}>`;
  }

  private objectToXmlInner(value: unknown): string {
    if (value == null) return '';
    if (Array.isArray(value)) {
      return value.map((item) => `<item>${this.objectToXmlInner(item)}</item>`).join('');
    }
    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>)
        .map(([key, inner]) => `<${key}>${this.objectToXmlInner(inner)}</${key}>`)
        .join('');
    }
    return this.escapeXml(String(value));
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private async resolveWorkspaceId(workspaceId?: string, workspaceSlug?: string): Promise<string> {
    if (workspaceId) return workspaceId;

    if (workspaceSlug) {
      const workspace = await this.prisma.workspace.findFirst({ where: { slug: workspaceSlug } });
      if (!workspace) {
        throw new NotFoundException(`Workspace with slug ${workspaceSlug} not found`);
      }
      return workspace.id;
    }

    throw new BadRequestException('workspaceId or workspaceSlug is required');
  }
}
