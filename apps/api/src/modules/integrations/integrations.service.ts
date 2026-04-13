import { BadGatewayException, BadRequestException, GatewayTimeoutException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CamelService } from '../camel/camel.service';
import { ConnectionsService } from '../connections/connections.service';
import { DriftDetectionService } from '../target-profiles/drift-detection.service';
import { ProfilesService } from '../profiles/profiles.service';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Base directory for route files; shared Docker volume is mounted here.
const ROUTES_DIR = process.env.CAMEL_ROUTES_DIR ?? '/app/camel-routes';

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly camel: CamelService,
    private readonly connections: ConnectionsService,
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

    // Build baseline validation from template defaults without auto-creating extra rules.
    const validationState = defaultMappings.validationBaseline
      ? {
          ...defaultMappings.validationBaseline,
          rules: [...(defaultMappings.validationBaseline.rules ?? [])],
          errorConfig: {
            logEnabled: defaultMappings.validationBaseline.errorConfig?.logEnabled ?? true,
            dlqEnabled: defaultMappings.validationBaseline.errorConfig?.dlqEnabled ?? false,
            dlqTopic: defaultMappings.validationBaseline.errorConfig?.dlqTopic ?? '',
            notifyChannel: defaultMappings.validationBaseline.errorConfig?.notifyChannel ?? 'None',
            notifyRecipients: defaultMappings.validationBaseline.errorConfig?.notifyRecipients ?? '',
            includeRecordData: defaultMappings.validationBaseline.errorConfig?.includeRecordData ?? false,
          },
        }
      : {
          rules: [],
          policyMode: 'Balanced',
          errorConfig: {
            logEnabled: true,
            dlqEnabled: false,
            dlqTopic: '',
            notifyChannel: 'None',
            notifyRecipients: '',
            includeRecordData: false,
          },
        };

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
      successCriteria: 'any_success',
      storeResponse: true,
      transformResponse: false,
      outputToSource: 'auto_if_expected',
      notificationEnabled: false,
      notificationDestinationUrl: '',
      notificationMethod: 'POST',
      notificationOnSuccess: true,
      notificationOnFailure: true,
      notificationPayloadMode: 'standard_response',
      businessErrorTranslationEnabled: false,
      loggingLevel: 'Standard',
      debugMode: false,
    };

    // Build baseline operations/monitoring
    const operationsState = defaultMappings.operationsBaseline ?? {
      storeRunHistory: true,
      storeErrorDetails: true,
      storePayloadSnapshots: false,
      retentionDays: 30,
      failureBehavior: 'retry',
      retryAttempts: 3,
      retryInterval: '5 min',
      partialSuccessPolicy: 'fail_entire_transaction',
      afterFinalFailureNotify: true,
      afterFinalFailureMarkFailed: true,
      afterFinalFailureMoveToQueue: false,
      notifyOnFirstFailure: true,
      notifyAfterFinalFailure: true,
      notifyOnSuccess: false,
      alertRecipients: '',
      notificationType: 'None',
      enableDetailedDiagnostics: false,
      includePayloadInAlerts: false,
      loggingLevel: 'Standard',
      debugMode: false,
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
            create: defaultMappings.mappings.map((m: any) => {
              const rawMappingType = String(m.mappingType ?? '').toUpperCase();
              const supportedMappingTypes = ['DIRECT', 'CONSTANT', 'DERIVED', 'LOOKUP', 'CONDITIONAL'];
              const mappingType = (supportedMappingTypes.includes(rawMappingType)
                ? rawMappingType
                : (m.transformConfig ? 'CONDITIONAL' : 'DIRECT')) as 'DIRECT' | 'CONSTANT' | 'DERIVED' | 'LOOKUP' | 'CONDITIONAL';

              return {
                sourceField: m.sourceField ?? m.source ?? '',
                targetField: m.targetField ?? m.target ?? '',
                mappingType,
                transformConfig: m.transformConfig ?? undefined,
                status: 'PENDING_REVIEW' as const,
              };
            }),
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

    const sourceState = (((integration as any).sourceState ?? {}) as Record<string, unknown>);
    const targetState = (((integration as any).targetState ?? {}) as Record<string, unknown>);
    const primarySource = ((sourceState.primary ?? {}) as Record<string, unknown>);
    const primaryTarget = (Array.isArray(targetState.targets) ? targetState.targets[0] : null) as Record<string, unknown> | null;

    const yaml = this.camel.generateRestToRestYaml({
      routeId: `${integration.id}`,
      description: `${integration.name}`,
      sourceBaseUrl: 'https://{{source.base-url}}',
      sourcePath: this.readNonEmptyString(primarySource.endpointPath) ?? '{{source.path}}',
      sourceMethod: this.readNonEmptyString(primarySource.operation) ?? 'GET',
      sourceQueryParams: this.readKeyValueEntries(primarySource.queryParams),
      targetBaseUrl: 'https://{{target.base-url}}',
      targetPath: this.readNonEmptyString(primaryTarget?.endpointPath) ?? '{{target.path}}',
      targetMethod: this.readNonEmptyString(primaryTarget?.operation) ?? 'POST',
      targetQueryParams: this.readKeyValueEntries(primaryTarget?.params),
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

  async listTestRuns(integrationId: string, limit = 20) {
    const take = Math.min(Math.max(limit ?? 20, 1), 100);
    const testRuns = await this.prisma.integrationTestRun.findMany({
      where: { integrationDefId: integrationId },
      include: {
        receipts: {
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });

    return testRuns.map((testRun) => this.formatTestRunResponse(testRun, false));
  }

  /**
   * Poll for the status/result of a test run.
   */
  async getTestRunStatus(integrationId: string, testRunId: string) {
    const testRun = await this.prisma.integrationTestRun.findUnique({
      where: { id: testRunId },
      include: {
        receipts: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!testRun || testRun.integrationDefId !== integrationId) {
      throw new NotFoundException(`Test run ${testRunId} not found`);
    }

    return this.formatTestRunResponse(testRun, true);
  }

  private formatTestRunResponse(testRun: any, includePayloads: boolean) {
    const isComplete = testRun.status === 'SUCCESS' || testRun.status === 'FAILED';

    const allMessages = (testRun.validationErrors as string[] | null) ?? [];
    const validationWarnings = allMessages.filter((m) => m.startsWith('Record "'));
    const hardErrors = allMessages.filter((m) => !m.startsWith('Record "'));

    const isPartialValidation = testRun.validationStatus === 'PARTIAL';
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
      createdAt: testRun.createdAt,
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
      payloads: includePayloads && isComplete ? {
        source: this.truncatePayloadForResponse(testRun.sourcePayload, 5),
        outboundJson: testRun.outboundPayloadJson,
        passedJson: passedPayload,
        failedJson: failedPayload,
        outboundRaw: testRun.outboundPayloadRaw ?? null,
      } : undefined,
      targetResponse: includePayloads && isComplete ? {
        statusCode: testRun.targetResponseStatusCode,
        body: testRun.targetResponseBody,
        headers: testRun.targetResponseHeaders ?? {},
        targetType: testRun.targetType,
        targetName: testRun.targetName,
      } : undefined,
      targetType: testRun.targetType,
      targetName: testRun.targetName,
      hasReceipt: Array.isArray(testRun.receipts) ? testRun.receipts.length > 0 : false,
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
    const responseHandlingState = this.readJsonObject(integration.responseHandlingState);
    const opsState = this.readJsonObject(integration.operationsState);
    // Normalize: support both new field names and legacy field names from old saved data
    const rhSuccessCriteria = String(responseHandlingState.successCriteria ?? 'any_success');
    // Failure recovery fields now live in operationsState; fall back to responseHandlingState for legacy data
    const rhFailureBehavior = String(opsState.failureBehavior ?? responseHandlingState.failureBehavior ?? 'retry');
    const rhRetryAttempts = Number(opsState.retryAttempts ?? responseHandlingState.retryAttempts ?? 3);
    const rhPartialPolicy = String(opsState.partialSuccessPolicy ?? responseHandlingState.partialSuccessPolicy ?? 'fail_entire_transaction');

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
      const shouldPreferJsPreview = mappingRules.some((rule: any) => {
        const sourceField = String(rule.sourceField ?? '');
        const targetField = String(rule.targetField ?? '');
        const mappingType = String(rule.mappingType ?? 'DIRECT').toUpperCase();
        const transformType = String(this.readJsonObject(rule.transformConfig).type ?? '').toLowerCase();
        return sourceField.includes('::') || targetField.includes('::') || ['CONSTANT', 'CONDITIONAL', 'DERIVED'].includes(mappingType) || ['constant', 'conditional', 'formula', 'filter'].includes(transformType);
      });

      // Map each source record individually
      const mappedRecords: Record<string, unknown>[] = [];
      for (const sourceRecord of sourceRecords) {
        const jsMapped = this.runJsDirectMappingFallback(sourceRecord, mappingRules);
        let mapped: Record<string, unknown> | null = null;
        try {
          mapped = await this.camel.runMappingPreview({
            sourcePayload: sourceRecord,
            fieldMappings,
          });
          if (shouldPreferJsPreview && jsMapped) {
            mapped = jsMapped;
          } else if (mapped && this.isCamelOutputGarbage(mapped) && jsMapped) {
            mapped = jsMapped;
          }
        } catch {
          mapped = jsMapped;
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

      if (failedRecordEntries.length === 0) {
        validationStatus = 'SUCCESS';
      } else if (passedRecords.length > 0) {
        validationStatus = 'PARTIAL';
      } else {
        validationStatus = 'FAILED';
      }

      // Enforce partial success policy — support both new and legacy values
      const shouldDeliverPartial = validationStatus === 'PARTIAL' && (rhPartialPolicy === 'allow_partial_success' || rhPartialPolicy === 'allow-partial');
      const shouldDeliver = validationStatus === 'SUCCESS' || shouldDeliverPartial;
      const recordsToDeliver = shouldDeliverPartial ? passedRecords : (validationStatus === 'SUCCESS' ? passedRecords : []);
      const deliverablePayload = recordsToDeliver.length === 1 ? recordsToDeliver[0] : recordsToDeliver;

      if (validationStatus === 'PARTIAL' && (rhPartialPolicy === 'fail_entire_transaction' || rhPartialPolicy === 'fail-all')) {
        errors.push(`Partial success blocked by fail_entire_transaction policy (${failedRecordEntries.length} failed records)`);
      }

      // Deliver records to target
      if (!opts.dryRun && shouldDeliver && recordsToDeliver.length > 0) {
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

        // Evaluate success based on configured success criteria
        // Support both new values (only_2xx, any_success) and legacy (2xx, any)
        if (rhSuccessCriteria === 'only_2xx' || rhSuccessCriteria === '2xx') {
          targetDeliveryStatus = delivery.statusCode >= 200 && delivery.statusCode < 300 ? 'SUCCESS' : 'FAILED';
        } else {
          // 'any_success' / 'any' — any response from target counts as success
          targetDeliveryStatus = delivery.statusCode < 500 ? 'SUCCESS' : 'FAILED';
        }

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

    // Fire notification webhook if configured — read new field names with legacy fallbacks
    const notifEnabled = Boolean(responseHandlingState.notificationEnabled ?? responseHandlingState.callbackEnabled);
    const notifDestination = String(responseHandlingState.notificationDestinationUrl ?? responseHandlingState.callbackDestination ?? '').trim();
    if (notifEnabled && notifDestination) {
      const isSuccess = testStatus === 'success';
      const shouldFire =
        (isSuccess && Boolean(responseHandlingState.notificationOnSuccess ?? responseHandlingState.callbackOnSuccess)) ||
        (!isSuccess && Boolean(responseHandlingState.notificationOnFailure ?? responseHandlingState.callbackOnFailure));

      if (shouldFire) {
        await this.fireCallback({
          destination: notifDestination,
          method: String(responseHandlingState.notificationMethod ?? responseHandlingState.callbackMethod ?? 'POST'),
          integrationId: id,
          testRunId,
          status: testStatus,
          targetResponseStatusCode,
          targetResponseBody,
        }).catch((err) => {
          this.logger.warn(`Callback delivery failed for ${id}: ${err instanceof Error ? err.message : err}`);
        });
      }
    }

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
      const shouldPreferJsPreview = mappingRules.some((rule: any) => {
        const sourceField = String(rule.sourceField ?? '');
        const targetField = String(rule.targetField ?? '');
        const mappingType = String(rule.mappingType ?? 'DIRECT').toUpperCase();
        const transformType = String(this.readJsonObject(rule.transformConfig).type ?? '').toLowerCase();
        return sourceField.includes('::') || targetField.includes('::') || ['CONSTANT', 'CONDITIONAL', 'DERIVED'].includes(mappingType) || ['constant', 'conditional', 'formula', 'filter'].includes(transformType);
      });
      const jsPreview = this.runJsDirectMappingFallback(previewSource, mappingRules);

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
        if (shouldPreferJsPreview && jsPreview) {
          targetPayload = jsPreview;
        } else if (targetPayload && this.isCamelOutputGarbage(targetPayload) && jsPreview) {
          targetPayload = jsPreview;
        }
      } catch (error) {
        targetPayload = jsPreview;
        if (targetPayload) {
          targetError = null;
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
      previewedAt: new Date().toISOString(),
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

  /**
   * Fire a callback/notification webhook to the configured destination.
   * Used after test runs complete to notify external systems of the outcome.
   */
  private async fireCallback(params: {
    destination: string;
    method: string;
    integrationId: string;
    testRunId: string;
    status: string;
    targetResponseStatusCode: number | null;
    targetResponseBody: string | null;
  }): Promise<void> {
    const url = new URL(params.destination);

    // Block internal/metadata URLs (SSRF protection)
    const host = url.hostname;
    if (['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(host) || host.startsWith('169.254.') || host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('metadata.')) {
      this.logger.warn(`Callback blocked: destination ${params.destination} targets internal address`);
      return;
    }

    const payload = {
      event: params.status === 'success' ? 'integration.test.success' : 'integration.test.failure',
      integrationId: params.integrationId,
      testRunId: params.testRunId,
      status: params.status,
      targetResponseStatusCode: params.targetResponseStatusCode,
      timestamp: new Date().toISOString(),
    };

    const method = params.method === 'PUT' ? 'PUT' : 'POST';

    const response = await fetch(params.destination, {
      method,
      headers: { 'Content-Type': 'application/json', 'X-Cogniviti-Event': payload.event },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    this.logger.log(`Callback delivered to ${params.destination}: HTTP ${response.status}`);
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
    const inspect = (candidate: unknown): boolean => {
      if (candidate == null) return false;
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        // Java HashMap.toString() pattern: {key=val, key2=val2}
        if (/^\{[a-z][\w-]+=/.test(trimmed) && trimmed.includes(', ')) return true;
        // Literal Camel simple-language expressions leaked through.
        if (/== null \? null :.*\.(toUpperCase|toLowerCase|trim)\(\)/.test(trimmed)) return true;
        // JSON-encoded transform objects leaked into output instead of evaluated values.
        if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && /"type"\s*:\s*"(constant|conditional|formula|lookup|concat|dateformat|filter)"/i.test(trimmed)) {
          return true;
        }
      }
      if (Array.isArray(candidate)) return candidate.some((item) => inspect(item));
      if (candidate && typeof candidate === 'object') {
        const obj = candidate as Record<string, unknown>;
        const type = String(obj.type ?? '').toLowerCase();
        if (['constant', 'conditional', 'formula', 'lookup', 'concat', 'dateformat', 'filter'].includes(type)) {
          return true;
        }
        return Object.values(obj).some((item) => inspect(item));
      }
      return false;
    };

    return inspect(mapped);
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
      return this.executeMapping(sourcePayload, mappingRules);
    } catch {
      return null;
    }
  }

  private readJsonObject(value: unknown): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return {};
      if (trimmed.startsWith('{') || trimmed.startsWith('[') || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        try {
          const parsed = JSON.parse(trimmed);
          return this.readJsonObject(parsed);
        } catch {
          return {};
        }
      }
      return {};
    }
    if (typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private normalizeDataPath(pathValue: string): string {
    return String(pathValue ?? '')
      .replace(/::/g, '.')
      .replace(/\[\*\]/g, '.*')
      .replace(/\[(\d+)\]/g, '.$1')
      .replace(/^\.+|\.+$/g, '');
  }

  private coercePreviewScalar(value: unknown): unknown {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      return obj.code ?? obj.name ?? obj.value ?? obj.id ?? value;
    }
    return value;
  }

  private readNonEmptyString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return null;
  }

  private readKeyValueEntries(value: unknown): Array<{ key: string; value: string }> {
    if (!Array.isArray(value)) return [];
    return value
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
      .map((entry) => ({
        key: String(entry.key ?? '').trim(),
        value: String(entry.value ?? ''),
      }))
      .filter((entry) => entry.key.length > 0);
  }

  private readNestedTransformString(
    value: unknown,
    preferredKeys: string[] = ['expression', 'rule', 'filter', 'value', 'constant'],
    depth = 0,
  ): string | null {
    if (depth > 12 || value == null) return null;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith('{') || trimmed.startsWith('[') || (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
        try {
          return this.readNestedTransformString(JSON.parse(trimmed), preferredKeys, depth + 1) ?? trimmed;
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    for (const key of preferredKeys) {
      const nested = this.readNestedTransformString(record[key], preferredKeys, depth + 1);
      if (nested) return nested;
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

    const normalizedPath = this.normalizeDataPath(pathValue);
    if (!normalizedPath) return null;

    const walk = (current: unknown, keys: string[]): unknown => {
      if (keys.length === 0) return current;
      if (current == null) return null;

      const [key, ...rest] = keys;

      if (Array.isArray(current)) {
        const items = key === '*'
          ? current
          : /^\d+$/.test(key)
            ? [current[Number(key)]]
            : current;

        const results = items
          .flatMap((item) => {
            const next = key === '*' || /^\d+$/.test(key) ? walk(item, rest) : walk(item, [key, ...rest]);
            return Array.isArray(next) ? next : [next];
          })
          .filter((item) => item != null && item !== '');

        if (results.length === 0) return null;
        return results.length === 1 ? results[0] : results;
      }

      if (typeof current !== 'object') return null;
      return walk((current as Record<string, unknown>)[key], rest);
    };

    return walk(input, normalizedPath.split('.').filter(Boolean));
  }

  private setValueByPath(target: Record<string, unknown>, pathValue: string, value: unknown) {
    const normalizedPath = this.normalizeDataPath(pathValue);
    const keys = normalizedPath.split('.').filter(Boolean);
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
    const normalizedTransform = this.readJsonObject(transformConfig);
    const kind = String(normalizedTransform.type ?? '').toLowerCase();
    if (!kind) return value;

    if (kind === 'uppercase') return value == null ? value : String(value).toUpperCase();
    if (kind === 'lowercase') return value == null ? value : String(value).toLowerCase();
    if (kind === 'trim') return value == null ? value : String(value).trim();
    if (kind === 'constant') {
      return this.readNestedTransformString(normalizedTransform.value, ['value', 'constant'])
        ?? this.readNestedTransformString(normalizedTransform.constant, ['value', 'constant'])
        ?? normalizedTransform.value
        ?? normalizedTransform.constant
        ?? value;
    }

    if (kind === 'lookup') {
      const table = this.readJsonObject(normalizedTransform.table);
      const lookupKey = value == null ? '' : String(value);
      if (Object.prototype.hasOwnProperty.call(table, lookupKey)) {
        return table[lookupKey];
      }
      return value;
    }

    if (kind === 'concat') {
      const separator = this.readNonEmptyString(normalizedTransform.separator) ?? ' ';
      const configuredFields = Array.isArray(normalizedTransform.sourceFields)
        ? normalizedTransform.sourceFields.filter((f): f is string => typeof f === 'string' && f.trim().length > 0)
        : [];
      const fields = configuredFields.length > 0 ? configuredFields : [sourceField];
      const parts = fields
        .map((path) => this.getValueByPath(sourcePayload, path))
        .flatMap((item) => Array.isArray(item) ? item : [item])
        .filter((item) => item != null && String(item).length > 0)
        .map((item) => String(this.coercePreviewScalar(item)));
      return parts.join(separator);
    }

    if (kind === 'dateformat') {
      const fromFormat = this.readNonEmptyString(normalizedTransform.fromFormat) ?? 'YYYY-MM-DD';
      const toFormat = this.readNonEmptyString(normalizedTransform.toFormat) ?? 'YYYY-MM-DD';
      return this.convertDateFormat(value, fromFormat, toFormat);
    }

    if (kind === 'filter') {
      return this.applyFilterTransform(value, normalizedTransform, sourcePayload, sourceField);
    }

    if (kind === 'formula' || kind === 'conditional') {
      const expression = this.readNestedTransformString(normalizedTransform, ['expression', 'rule']);
      if (!expression) return value;
      return this.evaluateExpression(expression, value, sourcePayload, sourceField);
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

  private applyFilterTransform(
    value: unknown,
    transformConfig: Record<string, unknown>,
    sourcePayload: unknown,
    sourceField: string,
  ): unknown {
    const filterExpression = this.readNestedTransformString(transformConfig, ['filter', 'expression', 'rule']);
    if (!filterExpression) return value;

    const normalizedSourceField = this.normalizeDataPath(sourceField);
    const [rootArrayPath, ...restParts] = normalizedSourceField.split('.');
    if (!rootArrayPath) return value;

    const candidates = this.getValueByPath(sourcePayload, rootArrayPath);
    if (!Array.isArray(candidates)) return value;

    const remainderPath = restParts.join('.');
    const matched = candidates.filter((item) => this.evaluateBooleanConditions(filterExpression, item, value, sourceField, rootArrayPath));
    if (matched.length === 0) return value;

    if (!remainderPath) {
      return matched.length === 1 ? matched[0] : matched;
    }

    const resolved = matched
      .flatMap((item) => {
        const candidate = this.getValueByPath(item, remainderPath);
        return Array.isArray(candidate) ? candidate : [candidate];
      })
      .filter((item) => item != null && item !== '');

    if (resolved.length === 0) return value;
    if (resolved.length === 1) return this.coercePreviewScalar(resolved[0]);
    return resolved.map((item) => this.coercePreviewScalar(item));
  }

  private evaluateBooleanConditions(
    expression: string,
    sourcePayload: unknown,
    value: unknown,
    sourceField: string,
    stripPrefix?: string,
  ): boolean {
    return expression
      .split(/\s*&&\s*/)
      .every((clause) => this.evaluateSingleCondition(clause.trim(), sourcePayload, value, sourceField, stripPrefix));
  }

  private evaluateSingleCondition(
    clause: string,
    sourcePayload: unknown,
    value: unknown,
    sourceField: string,
    stripPrefix?: string,
  ): boolean {
    const match = clause.match(/^(.+?)\s*(===|==|!==|!=)\s*(.+)$/);
    if (!match) return Boolean(value);

    const left = this.resolveConditionToken(match[1], sourcePayload, value, sourceField, stripPrefix);
    const right = this.resolveConditionToken(match[3], sourcePayload, value, sourceField, stripPrefix, true);
    const operator = match[2];
    const isEqual = this.compareConditionValues(left, right);
    return operator === '!=' || operator === '!==' ? !isEqual : isEqual;
  }

  private resolveConditionToken(
    token: string,
    sourcePayload: unknown,
    value: unknown,
    sourceField: string,
    stripPrefix?: string,
    preferLiteral = false,
  ): unknown {
    const trimmed = token.trim();
    const literal = this.parseConditionLiteral(trimmed);
    if (preferLiteral || literal.matched) return literal.value;

    if (trimmed === 'value') return value;
    if (trimmed === sourceField || trimmed === this.normalizeDataPath(sourceField)) return value;

    const normalized = this.normalizeDataPath(trimmed);
    const normalizedPrefix = stripPrefix ? `${this.normalizeDataPath(stripPrefix)}.` : '';
    const localPath = normalizedPrefix && normalized.startsWith(normalizedPrefix)
      ? normalized.slice(normalizedPrefix.length)
      : normalized;

    const resolved = this.getValueByPath(sourcePayload, localPath);
    return resolved == null ? trimmed : resolved;
  }

  private parseConditionLiteral(token: string): { matched: boolean; value: unknown } {
    const trimmed = token.trim();
    if (trimmed === 'true') return { matched: true, value: true };
    if (trimmed === 'false') return { matched: true, value: false };
    if (trimmed === 'null') return { matched: true, value: null };
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return { matched: true, value: trimmed.slice(1, -1) };
    }
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return { matched: true, value: Number(trimmed) };
    return { matched: false, value: trimmed };
  }

  private compareConditionValues(left: unknown, right: unknown): boolean {
    if (Array.isArray(left)) return left.some((item) => this.compareConditionValues(item, right));
    if (Array.isArray(right)) return right.some((item) => this.compareConditionValues(left, item));
    if (typeof left === 'boolean' || typeof right === 'boolean') return Boolean(left) === Boolean(right);
    if (typeof left === 'number' || typeof right === 'number') return Number(left) === Number(right);
    return String(left ?? '') === String(right ?? '');
  }

  private evaluateExpression(expression: string, value: unknown, sourcePayload: unknown, sourceField = ''): unknown {
    const trimmed = expression.trim();
    const ternary = trimmed.match(/^(.*)\?(.*):(.*)$/);
    if (ternary) {
      const [, conditionPart, truePart, falsePart] = ternary;
      const conditionPassed = this.evaluateBooleanConditions(conditionPart.trim(), sourcePayload, value, sourceField);
      const chosen = conditionPassed ? truePart.trim() : falsePart.trim();
      const literal = this.parseConditionLiteral(chosen);
      if (literal.matched) return literal.value;
    }

    try {
      let prepared = trimmed;
      const aliases = [sourceField, this.normalizeDataPath(sourceField)].filter((alias) => alias && alias.length > 0);
      for (const alias of aliases) {
        prepared = prepared.split(alias).join('value');
      }
      const fn = new Function('value', 'record', `return (${prepared});`);
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

  // ═══════════════════════════════════════════════════════════════════════════
  // NODE-LEVEL DIAGNOSTICS — per-node test actions
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * TRIGGER — Test Trigger: Validate the trigger configuration is well-formed
   * and simulate a trigger invocation (cron parse, webhook reachability, etc.)
   */
  async testTrigger(id: string) {
    const integration = await this.prisma.integrationDefinition.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);

    const triggerState = this.readJsonObject(integration.triggerState);
    const triggerType = String(triggerState.triggerType ?? 'Manual');
    const checks: { check: string; status: 'pass' | 'fail' | 'warn'; detail: string }[] = [];

    if (triggerType === 'Schedule / Cron') {
      const cron = String(triggerState.cronExpression ?? '').trim();
      if (!cron) {
        checks.push({ check: 'Cron expression', status: 'fail', detail: 'Empty cron expression' });
      } else {
        // Basic cron validation: 5 or 6 fields separated by spaces
        const parts = cron.split(/\s+/);
        if (parts.length >= 5 && parts.length <= 7) {
          checks.push({ check: 'Cron expression', status: 'pass', detail: `Valid format: "${cron}" (${parts.length} fields)` });
        } else {
          checks.push({ check: 'Cron expression', status: 'fail', detail: `Invalid cron: "${cron}" (${parts.length} fields, expected 5-7)` });
        }
      }
      const tz = String(triggerState.timezone ?? '').trim();
      checks.push(tz
        ? { check: 'Timezone', status: 'pass', detail: tz }
        : { check: 'Timezone', status: 'warn', detail: 'No timezone set — will use server default (UTC)' }
      );
    } else if (triggerType === 'Webhook') {
      const webhookPath = String(triggerState.webhookPath ?? '').trim();
      if (!webhookPath) {
        checks.push({ check: 'Webhook path', status: 'fail', detail: 'No webhook path configured' });
      } else {
        checks.push({ check: 'Webhook path', status: 'pass', detail: webhookPath });
      }
      const method = String(triggerState.webhookMethod ?? 'POST');
      checks.push({ check: 'Webhook method', status: 'pass', detail: method });
    } else {
      // Manual
      const manualEnabled = Boolean(triggerState.manualExecutionEnabled);
      checks.push(manualEnabled
        ? { check: 'Manual execution', status: 'pass', detail: 'Manual execution is enabled' }
        : { check: 'Manual execution', status: 'fail', detail: 'Manual execution is disabled' }
      );
    }

    const overallStatus = checks.some(c => c.status === 'fail') ? 'fail' : checks.some(c => c.status === 'warn') ? 'warn' : 'pass';

    return {
      triggerType,
      status: overallStatus,
      checks,
      testedAt: new Date().toISOString(),
    };
  }

  /**
   * TRIGGER — View Last Invocation: Return the most recent test run or workflow run
   */
  async viewLastInvocation(id: string) {
    const integration = await this.prisma.integrationDefinition.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);

    // Get the most recent test run
    const lastTestRun = await this.prisma.integrationTestRun.findFirst({
      where: { integrationDefId: id },
      orderBy: { createdAt: 'desc' },
    });

    if (!lastTestRun) {
      return { hasInvocation: false, message: 'No test runs found for this integration.' };
    }

    return {
      hasInvocation: true,
      testRunId: lastTestRun.id,
      status: lastTestRun.status,
      createdAt: lastTestRun.createdAt.toISOString(),
      sourceFetchStatus: lastTestRun.sourceFetchStatus,
      mappingStatus: lastTestRun.mappingStatus,
      validationStatus: lastTestRun.validationStatus,
      targetDeliveryStatus: lastTestRun.targetDeliveryStatus,
      normalizedErrorSummary: lastTestRun.normalizedErrorSummary,
    };
  }

  /**
   * SOURCE / TARGET — Test Connection: delegates to ConnectionsService
   * Resolves the connection ID from the integration's source or target state.
   */
  async testNodeConnection(id: string, node: 'source' | 'target') {
    const integration = await this.prisma.integrationDefinition.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);

    let connectionId: string | null = null;
    if (node === 'source') {
      connectionId = integration.sourceConnectionId;
      if (!connectionId) {
        const sourceState = this.readJsonObject(integration.sourceState);
        const primary = sourceState?.primary as Record<string, unknown> | undefined;
        connectionId = String(primary?.connectionId ?? '') || null;
      }
    } else {
      connectionId = integration.targetConnectionId;
      if (!connectionId) {
        const targetState = this.readJsonObject(integration.targetState);
        const targets = Array.isArray(targetState?.targets) ? targetState.targets : [];
        connectionId = String(targets[0]?.connectionId ?? '') || null;
      }
    }

    if (!connectionId) {
      return { status: 'error', message: `No ${node} connection configured for this integration.`, testedAt: new Date().toISOString() };
    }

    // Detect demo / internal targets (downloadable JSON/XML) — skip real connection test
    if (connectionId === 'INTERNAL_DEMO') {
      const targetState = this.readJsonObject(integration.targetState);
      const targets = Array.isArray(targetState?.targets) ? targetState.targets : [];
      const family = String(targets[0]?.connectionFamily ?? '');
      const targetName = String(targets[0]?.name ?? targets[0]?.connectionName ?? 'Demo Target');
      return {
        connectionId,
        status: 'success',
        message: `${targetName} is a built-in demo receiver — no external connection required.`,
        connectionFamily: family,
        demo: true,
        testedAt: new Date().toISOString(),
      };
    }

    try {
      const result = await this.connections.testConnectionDefault(connectionId);
      return result;
    } catch (err) {
      return {
        connectionId,
        status: 'error',
        message: err instanceof Error ? err.message : `Failed to test ${node} connection`,
        testedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * SOURCE — Fetch Sample: Uses the existing fetchLiveSourcePayload to get a sample record
   */
  async fetchSourceSample(id: string) {
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
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);

    try {
      const result = await this.fetchLiveSourcePayload(integration);
      const sample = this.unwrapPreviewSourceRecord(result.payload);
      return {
        status: 'success',
        payload: sample,
        recordCount: Array.isArray(result.payload) ? (result.payload as unknown[]).length : 1,
        fetchedAt: new Date().toISOString(),
      };
    } catch (err) {
      return {
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to fetch source sample',
        fetchedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * MAPPING — Run Preview: Fetches source + applies mapping to produce a preview output
   * Reuses the existing previewPayloads method.
   */
  async runMappingPreview(id: string) {
    return this.previewPayloads(id);
  }

  /**
   * VALIDATION — Validate Sample: Accepts a sample payload and runs validation rules
   */
  async validateSample(id: string, samplePayload: Record<string, unknown>) {
    const integration = await this.prisma.integrationDefinition.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);

    const validationState = this.readJsonObject(integration.validationState);
    const rules = Array.isArray(validationState.rules) ? validationState.rules : [];
    const policyMode = String(validationState.policyMode ?? 'Balanced');

    if (rules.length === 0) {
      return { status: 'pass', message: 'No validation rules configured.', results: [], testedAt: new Date().toISOString() };
    }

    const { errors, warnings } = this.executeValidation(samplePayload, { rules: rules as any });

    const ruleResults = rules.filter((r: any) => r && r.enabled !== false).map((rule: any) => {
      const fieldValue = this.getValueByPath(samplePayload, rule.field ?? '');
      let passed = true;

      if (rule.field && rule.operator) {
        const ruleValue = Array.isArray(rule.value) ? rule.value : String(rule.value ?? '');
        switch (rule.operator) {
          case 'IS_NOT_EMPTY': passed = fieldValue !== null && fieldValue !== undefined && fieldValue !== ''; break;
          case 'EQUALS': passed = String(fieldValue) === String(ruleValue); break;
          case 'NOT_EQUALS': passed = String(fieldValue) !== String(ruleValue); break;
          case 'GREATER_THAN': passed = Number(fieldValue) > Number(ruleValue); break;
          case 'LESS_THAN': passed = Number(fieldValue) < Number(ruleValue); break;
          case 'IN': {
            const list = Array.isArray(ruleValue) ? ruleValue : String(ruleValue).split(',').map((s: string) => s.trim());
            passed = list.includes(String(fieldValue)); break;
          }
          case 'NOT_IN': {
            const list = Array.isArray(ruleValue) ? ruleValue : String(ruleValue).split(',').map((s: string) => s.trim());
            passed = !list.includes(String(fieldValue)); break;
          }
          case 'MATCHES': try { passed = new RegExp(String(ruleValue)).test(String(fieldValue ?? '')); } catch { passed = false; } break;
          case 'LENGTH_MIN': passed = String(fieldValue ?? '').length >= Number(ruleValue); break;
          case 'LENGTH_MAX': passed = String(fieldValue ?? '').length <= Number(ruleValue); break;
          default: passed = true;
        }
      }

      return {
        ruleId: rule.id,
        ruleName: rule.name || `Rule on ${rule.field}`,
        field: rule.field,
        operator: rule.operator,
        severity: rule.severity ?? 'Error',
        passed,
        message: passed ? 'Passed' : `${rule.field} ${rule.operator} check failed`,
      };
    });

    const failedCount = ruleResults.filter((r: any) => !r.passed).length;
    const status = failedCount === 0 ? 'pass' : errors.length > 0 ? 'fail' : 'warn';

    return {
      status,
      policyMode,
      totalRules: ruleResults.length,
      passed: ruleResults.filter((r: any) => r.passed).length,
      failed: failedCount,
      errorCount: errors.length,
      warningCount: warnings.length,
      results: ruleResults,
      testedAt: new Date().toISOString(),
    };
  }

  /**
   * RESPONSE — Preview Response Handling: Returns the current response handling config
   * along with a simulated example of how a success/error response would be processed
   */
  async previewResponseHandling(id: string) {
    const integration = await this.prisma.integrationDefinition.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);

    const responseState = this.readJsonObject(integration.responseHandlingState);
    const targetState = this.readJsonObject(integration.targetState);
    const targets = Array.isArray(targetState?.targets) ? targetState.targets : [];
    const primaryTarget = targets[0] as Record<string, unknown> | undefined;

    // Get last test run for real response data
    const lastTestRun = await this.prisma.integrationTestRun.findFirst({
      where: { integrationDefId: id, status: { in: ['SUCCESS', 'FAILED'] } },
      orderBy: { createdAt: 'desc' },
    });

    return {
      config: {
        successCriteria: String(responseState.successCriteria ?? 'any_success'),
        storeResponse: Boolean(responseState.storeResponse),
        transformResponse: Boolean(responseState.transformResponse),
        outputToSource: String(responseState.outputToSource ?? 'auto_if_expected'),
        notificationEnabled: Boolean(responseState.notificationEnabled ?? responseState.callbackEnabled),
        notificationDestinationUrl: String(responseState.notificationDestinationUrl ?? responseState.callbackDestination ?? ''),
        notificationMethod: String(responseState.notificationMethod ?? responseState.callbackMethod ?? 'POST'),
        notificationOnSuccess: Boolean(responseState.notificationOnSuccess ?? responseState.callbackOnSuccess),
        notificationOnFailure: Boolean(responseState.notificationOnFailure ?? responseState.callbackOnFailure),
        notificationPayloadMode: String(responseState.notificationPayloadMode ?? 'standard_response'),
        businessErrorTranslationEnabled: Boolean(responseState.businessErrorTranslationEnabled ?? responseState.errorTranslationEnabled),
        loggingLevel: String(responseState.loggingLevel ?? 'Standard'),
        debugMode: Boolean(responseState.debugMode),
      },
      lastResponse: lastTestRun ? {
        testRunId: lastTestRun.id,
        status: lastTestRun.status,
        statusCode: lastTestRun.targetResponseStatusCode,
        body: lastTestRun.targetResponseBody,
        createdAt: lastTestRun.createdAt.toISOString(),
      } : null,
      targetName: primaryTarget?.name ?? primaryTarget?.connectionName ?? 'Not configured',
      testedAt: new Date().toISOString(),
    };
  }

  /**
   * OPERATIONS — Health Check: Aggregated health assessment of all integration components
   */
  async runHealthCheck(id: string) {
    const integration = await this.prisma.integrationDefinition.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);

    const checks: { component: string; status: 'healthy' | 'warning' | 'error' | 'unknown'; detail: string }[] = [];

    // Check source connection health
    const sourceState = this.readJsonObject(integration.sourceState);
    const primarySrc = sourceState?.primary as Record<string, unknown> | undefined;
    const sourceConnId = integration.sourceConnectionId ?? (String(primarySrc?.connectionId ?? '') || null);
    if (sourceConnId) {
      const lastSourceTest = await this.prisma.connectionTestHistory.findFirst({
        where: { connectionDefId: sourceConnId },
        orderBy: { testedAt: 'desc' },
      });
      if (lastSourceTest) {
        checks.push({
          component: 'Source Connection',
          status: lastSourceTest.success ? 'healthy' : 'error',
          detail: lastSourceTest.success ? `Healthy (last tested ${lastSourceTest.testedAt.toISOString()})` : (lastSourceTest.errorMessage ?? 'Last test failed'),
        });
      } else {
        checks.push({ component: 'Source Connection', status: 'unknown', detail: 'Never tested' });
      }
    } else {
      checks.push({ component: 'Source Connection', status: 'error', detail: 'No source connection configured' });
    }

    // Check target connection health
    const targetState = this.readJsonObject(integration.targetState);
    const targets = Array.isArray(targetState?.targets) ? targetState.targets : [];
    const targetConnId = integration.targetConnectionId ?? (String((targets[0] as any)?.connectionId ?? '') || null);
    if (targetConnId === 'INTERNAL_DEMO') {
      const demoName = String((targets[0] as any)?.name ?? 'Demo Target');
      checks.push({ component: 'Target Connection', status: 'healthy', detail: `${demoName} — built-in demo receiver (no external connection)` });
    } else if (targetConnId) {
      const lastTargetTest = await this.prisma.connectionTestHistory.findFirst({
        where: { connectionDefId: targetConnId },
        orderBy: { testedAt: 'desc' },
      });
      if (lastTargetTest) {
        checks.push({
          component: 'Target Connection',
          status: lastTargetTest.success ? 'healthy' : 'error',
          detail: lastTargetTest.success ? `Healthy (last tested ${lastTargetTest.testedAt.toISOString()})` : (lastTargetTest.errorMessage ?? 'Last test failed'),
        });
      } else {
        checks.push({ component: 'Target Connection', status: 'unknown', detail: 'Never tested' });
      }
    } else {
      checks.push({ component: 'Target Connection', status: 'warning', detail: 'No target connection configured (using demo target)' });
    }

    // Check last test run
    const lastTestRun = await this.prisma.integrationTestRun.findFirst({
      where: { integrationDefId: id },
      orderBy: { createdAt: 'desc' },
    });
    if (lastTestRun) {
      const ageMs = Date.now() - lastTestRun.createdAt.getTime();
      const ageHours = Math.round(ageMs / 3600000);
      checks.push({
        component: 'Last E2E Test',
        status: lastTestRun.status === 'SUCCESS' ? 'healthy' : lastTestRun.status === 'RUNNING' ? 'warning' : 'error',
        detail: `${lastTestRun.status} — ${ageHours}h ago (${lastTestRun.createdAt.toISOString()})`,
      });
    } else {
      checks.push({ component: 'Last E2E Test', status: 'unknown', detail: 'No test runs recorded' });
    }

    // Check mapping completeness
    const mappingSet = await this.prisma.mappingSet.findFirst({
      where: { integrationDefId: id },
      include: { rules: true },
      orderBy: { version: 'desc' },
    });
    if (mappingSet && mappingSet.rules.length > 0) {
      checks.push({ component: 'Mapping Rules', status: 'healthy', detail: `${mappingSet.rules.length} rules configured (v${mappingSet.version})` });
    } else {
      checks.push({ component: 'Mapping Rules', status: 'error', detail: 'No mapping rules configured' });
    }

    // Check validation rules
    const validationState = this.readJsonObject(integration.validationState);
    const valRules = Array.isArray(validationState.rules) ? validationState.rules : [];
    const enabledRules = valRules.filter((r: any) => r && r.enabled !== false);
    checks.push({
      component: 'Validation Rules',
      status: enabledRules.length > 0 ? 'healthy' : 'warning',
      detail: enabledRules.length > 0 ? `${enabledRules.length} enabled rules` : 'No validation rules enabled',
    });

    // Check readiness
    checks.push({
      component: 'Readiness',
      status: integration.readinessStatus === 'READY_FOR_RELEASE_REVIEW' || integration.readinessStatus === 'TEST_PASSED'
        ? 'healthy'
        : integration.readinessStatus === 'INCOMPLETE'
        ? 'warning'
        : 'unknown',
      detail: String(integration.readinessStatus ?? 'UNKNOWN'),
    });

    const overallStatus = checks.some(c => c.status === 'error') ? 'error' : checks.some(c => c.status === 'warning') ? 'warning' : 'healthy';

    return {
      status: overallStatus,
      checks,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * OPERATIONS — View Latest Alerts: Recent test failures, drift suggestions, profile notices
   */
  async viewLatestAlerts(id: string) {
    const integration = await this.prisma.integrationDefinition.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException(`Integration ${id} not found`);

    const alerts: { type: string; severity: 'info' | 'warning' | 'error'; message: string; createdAt: string }[] = [];

    // Recent failed test runs
    const failedRuns = await this.prisma.integrationTestRun.findMany({
      where: { integrationDefId: id, status: 'FAILED' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    for (const run of failedRuns) {
      alerts.push({
        type: 'test_failure',
        severity: 'error',
        message: run.normalizedErrorSummary ?? `E2E test failed (${run.id})`,
        createdAt: run.createdAt.toISOString(),
      });
    }

    // Profile update notices
    const notices = await this.prisma.profileUpdateNotice.findMany({
      where: { integrationDefId: id, status: { not: 'ACKNOWLEDGED' } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    for (const notice of notices) {
      alerts.push({
        type: 'profile_notice',
        severity: notice.impactLevel === 'BLOCKING' ? 'error' : notice.impactLevel === 'WARNING' ? 'warning' : 'info',
        message: `${notice.direction} profile update: ${notice.impactLevel} impact`,
        createdAt: notice.createdAt.toISOString(),
      });
    }

    // Drift suggestions
    if (integration.targetProfileId) {
      const drifts = await this.prisma.driftSuggestion.findMany({
        where: { targetProfileId: integration.targetProfileId, status: 'NEW' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      for (const drift of drifts) {
        alerts.push({
          type: 'drift_suggestion',
          severity: 'warning',
          message: `Drift detected on ${drift.fieldPath}: ${drift.suggestionType}`,
          createdAt: drift.createdAt.toISOString(),
        });
      }
    }

    // Sort all by date descending
    alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      alertCount: alerts.length,
      alerts: alerts.slice(0, 15),
      checkedAt: new Date().toISOString(),
    };
  }
}
