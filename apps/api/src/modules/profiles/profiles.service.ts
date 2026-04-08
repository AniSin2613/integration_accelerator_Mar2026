import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfileImpactAnalysisService } from './profile-impact-analysis.service';

interface ResolvePinnedProfileResult {
  effectiveProfileVersionId: string | null;
  schemaHash: string | null;
  updateStatus: 'UP_TO_DATE' | 'UPDATE_AVAILABLE' | 'REVIEW_REQUIRED' | 'END_OF_SUPPORT' | 'BLOCKED_BY_PROFILE_CHANGE';
  impactLevel: 'NO_IMPACT' | 'INFORMATIONAL' | 'WARNING' | 'BLOCKING';
}

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly impact: ProfileImpactAnalysisService,
  ) {}

  async resolvePinnedProfilesForTemplate(workspaceId: string, templateVersionId: string): Promise<{
    source: ResolvePinnedProfileResult;
    target: ResolvePinnedProfileResult;
  }> {
    const template = await this.prisma.templateVersion.findUnique({
      where: { id: templateVersionId },
      select: {
        sourceProfileFamilyId: true,
        sourceProfileVersionId: true,
        targetProfileFamilyId: true,
        targetProfileVersionId: true,
        schemaPacks: {
          include: {
            schemaPack: {
              select: {
                system: true,
                object: true,
              },
            },
          },
        },
      },
    });

    if (!template) throw new NotFoundException(`Template version ${templateVersionId} not found`);

    const sourceFamilyId =
      template.sourceProfileFamilyId ??
      (await this.findFamilyIdFromSchemaBinding(template.schemaPacks, 'SOURCE'));
    const targetFamilyId =
      template.targetProfileFamilyId ??
      (await this.findFamilyIdFromSchemaBinding(template.schemaPacks, 'TARGET'));

    const source = await this.resolvePinnedEffectiveProfile(
      workspaceId,
      sourceFamilyId,
      template.sourceProfileVersionId ?? null,
    );
    const target = await this.resolvePinnedEffectiveProfile(
      workspaceId,
      targetFamilyId,
      template.targetProfileVersionId ?? null,
    );

    return { source, target };
  }

  async listFamilies(direction?: 'SOURCE' | 'TARGET') {
    return this.prisma.profileFamily.findMany({
      where: direction ? { direction: direction as any } : undefined,
      include: {
        _count: {
          select: {
            baselineVersions: true,
            effectiveVersions: true,
          },
        },
      },
      orderBy: [{ direction: 'asc' }, { system: 'asc' }, { interfaceName: 'asc' }],
    });
  }

  async upsertFamily(body: {
    direction: 'SOURCE' | 'TARGET';
    system: string;
    interfaceName: string;
    object?: string;
    platformOwned?: boolean;
  }) {
    return this.prisma.profileFamily.upsert({
      where: {
        direction_system_interfaceName: {
          direction: body.direction as any,
          system: body.system,
          interfaceName: body.interfaceName,
        },
      },
      update: {
        object: body.object ?? null,
        platformOwned: body.platformOwned ?? true,
      },
      create: {
        direction: body.direction as any,
        system: body.system,
        interfaceName: body.interfaceName,
        object: body.object ?? null,
        platformOwned: body.platformOwned ?? true,
      },
    });
  }

  async publishBaselineVersion(body: {
    profileFamilyId: string;
    version: string;
    schemaSnapshot: unknown;
    publishedAt?: string;
  }) {
    const family = await this.prisma.profileFamily.findUnique({ where: { id: body.profileFamilyId } });
    if (!family) throw new NotFoundException(`Profile family ${body.profileFamilyId} not found`);

    const publishedAt = body.publishedAt ? new Date(body.publishedAt) : new Date();
    const hash = this.hashSchema(body.schemaSnapshot);

    const baseline = await this.prisma.$transaction(async (tx) => {
      await tx.profileVersion.updateMany({
        where: { profileFamilyId: family.id, status: 'CURRENT' as any },
        data: {
          status: 'DEPRECATED' as any,
          deprecatedAt: new Date(),
          endOfSupportAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });

      const created = await tx.profileVersion.upsert({
        where: {
          profileFamilyId_version: {
            profileFamilyId: family.id,
            version: body.version,
          },
        },
        update: {
          status: 'CURRENT' as any,
          schemaSnapshot: body.schemaSnapshot as any,
          schemaHash: hash,
          publishedAt,
          deprecatedAt: null,
          endOfSupportAt: null,
        },
        create: {
          profileFamilyId: family.id,
          version: body.version,
          status: 'CURRENT' as any,
          schemaSnapshot: body.schemaSnapshot as any,
          schemaHash: hash,
          publishedAt,
        },
      });

      await tx.effectiveProfileVersion.updateMany({
        where: {
          profileFamilyId: family.id,
          workspaceId: null,
          status: 'ACTIVE' as any,
        },
        data: { status: 'SUPERSEDED' as any },
      });

      await tx.effectiveProfileVersion.create({
        data: {
          profileFamilyId: family.id,
          baselineProfileVersionId: created.id,
          workspaceId: null,
          status: 'ACTIVE' as any,
          effectiveSchemaSnapshot: body.schemaSnapshot as any,
          schemaHash: hash,
          publishedAt,
        },
      });

      return created;
    });

    return baseline;
  }

  async listBaselineVersions(profileFamilyId: string) {
    return this.prisma.profileVersion.findMany({
      where: { profileFamilyId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async transitionBaselineVersion(
    versionId: string,
    body: { status: 'CURRENT' | 'DEPRECATED' | 'END_OF_SUPPORT'; deprecatedAt?: string; endOfSupportAt?: string },
  ) {
    const existing = await this.prisma.profileVersion.findUnique({ where: { id: versionId } });
    if (!existing) throw new NotFoundException(`Profile version ${versionId} not found`);

    if (body.status === 'CURRENT') {
      await this.prisma.profileVersion.updateMany({
        where: {
          profileFamilyId: existing.profileFamilyId,
          id: { not: existing.id },
          status: 'CURRENT' as any,
        },
        data: {
          status: 'DEPRECATED' as any,
          deprecatedAt: new Date(),
          endOfSupportAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });
    }

    return this.prisma.profileVersion.update({
      where: { id: versionId },
      data: {
        status: body.status as any,
        deprecatedAt: body.deprecatedAt ? new Date(body.deprecatedAt) : body.status === 'DEPRECATED' ? new Date() : null,
        endOfSupportAt: body.endOfSupportAt ? new Date(body.endOfSupportAt) : undefined,
      },
    });
  }

  async resolvePinnedEffectiveProfile(
    workspaceId: string,
    profileFamilyId: string | null,
    preferredBaselineVersionId?: string | null,
  ): Promise<ResolvePinnedProfileResult> {
    if (!profileFamilyId) {
      return {
        effectiveProfileVersionId: null,
        schemaHash: null,
        updateStatus: 'UP_TO_DATE',
        impactLevel: 'NO_IMPACT',
      };
    }

    const effective = await this.prisma.effectiveProfileVersion.findFirst({
      where: {
        profileFamilyId,
        ...(preferredBaselineVersionId ? { baselineProfileVersionId: preferredBaselineVersionId } : {}),
        status: 'ACTIVE' as any,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
      orderBy: [{ workspaceId: 'desc' as const }, { publishedAt: 'desc' as const }, { createdAt: 'desc' as const }],
      select: {
        id: true,
        schemaHash: true,
        baselineProfileVersion: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!effective) {
      return {
        effectiveProfileVersionId: null,
        schemaHash: null,
        updateStatus: 'REVIEW_REQUIRED',
        impactLevel: 'WARNING',
      };
    }

    const baselineStatus = String(effective.baselineProfileVersion.status);
    const updateStatus = baselineStatus === 'END_OF_SUPPORT' ? 'END_OF_SUPPORT' : 'UP_TO_DATE';

    return {
      effectiveProfileVersionId: effective.id,
      schemaHash: effective.schemaHash,
      updateStatus,
      impactLevel: updateStatus === 'END_OF_SUPPORT' ? 'BLOCKING' : 'NO_IMPACT',
    };
  }

  async refreshIntegrationProfileStatus(integrationId: string): Promise<void> {
    const integration = await this.prisma.integrationDefinition.findUnique({
      where: { id: integrationId },
      include: {
        workspace: { select: { id: true } },
        pinnedSourceEffectiveProfileVersion: {
          include: { profileFamily: true, baselineProfileVersion: true },
        },
        pinnedTargetEffectiveProfileVersion: {
          include: { profileFamily: true, baselineProfileVersion: true },
        },
      },
    });

    if (!integration) throw new NotFoundException(`Integration ${integrationId} not found`);

    const sourceStatus = await this.computeUpdateStatus(
      integration.workspace.id,
      integration.pinnedSourceEffectiveProfileVersion,
      'SOURCE',
      integration.id,
    );
    const targetStatus = await this.computeUpdateStatus(
      integration.workspace.id,
      integration.pinnedTargetEffectiveProfileVersion,
      'TARGET',
      integration.id,
    );

    await this.prisma.integrationDefinition.update({
      where: { id: integration.id },
      data: {
        sourceProfileUpdateStatus: sourceStatus.updateStatus as any,
        sourceProfileImpactLevel: sourceStatus.impactLevel as any,
        targetProfileUpdateStatus: targetStatus.updateStatus as any,
        targetProfileImpactLevel: targetStatus.impactLevel as any,
        profileReviewRequired:
          sourceStatus.updateStatus === 'REVIEW_REQUIRED' ||
          sourceStatus.updateStatus === 'END_OF_SUPPORT' ||
          sourceStatus.updateStatus === 'BLOCKED_BY_PROFILE_CHANGE' ||
          targetStatus.updateStatus === 'REVIEW_REQUIRED' ||
          targetStatus.updateStatus === 'END_OF_SUPPORT' ||
          targetStatus.updateStatus === 'BLOCKED_BY_PROFILE_CHANGE',
      },
    });
  }

  async listUpdateNotices(workspaceId: string, integrationDefId?: string) {
    return this.prisma.profileUpdateNotice.findMany({
      where: {
        workspaceId,
        ...(integrationDefId ? { integrationDefId } : {}),
      },
      include: {
        changes: true,
        pinnedEffectiveProfileVersion: {
          select: { id: true, schemaHash: true },
        },
        latestEffectiveProfileVersion: {
          select: { id: true, schemaHash: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acknowledgeNotice(noticeId: string) {
    return this.prisma.profileUpdateNotice.update({
      where: { id: noticeId },
      data: { status: 'ACKNOWLEDGED' as any },
    });
  }

  async createRebasePlan(params: {
    workspaceId: string;
    integrationDefId: string;
    direction: 'SOURCE' | 'TARGET';
    newBaselineProfileVersionId: string;
  }) {
    const integration = await this.prisma.integrationDefinition.findUnique({ where: { id: params.integrationDefId } });
    if (!integration) throw new NotFoundException(`Integration ${params.integrationDefId} not found`);

    const pinnedId =
      params.direction === 'SOURCE'
        ? integration.pinnedSourceEffectiveProfileVersionId
        : integration.pinnedTargetEffectiveProfileVersionId;

    if (!pinnedId) {
      throw new BadRequestException(`Integration has no pinned ${params.direction.toLowerCase()} effective profile`);
    }

    const pinned = await this.prisma.effectiveProfileVersion.findUnique({
      where: { id: pinnedId },
      select: {
        baselineProfileVersionId: true,
        overlayVersionId: true,
      },
    });
    if (!pinned) throw new NotFoundException(`Pinned effective profile ${pinnedId} not found`);

    return this.prisma.profileRebasePlan.create({
      data: {
        workspaceId: params.workspaceId,
        integrationDefId: params.integrationDefId,
        direction: params.direction as any,
        oldBaselineProfileVersionId: pinned.baselineProfileVersionId,
        newBaselineProfileVersionId: params.newBaselineProfileVersionId,
        currentOverlayVersionId: pinned.overlayVersionId,
      },
    });
  }

  async analyzeRebasePlan(rebasePlanId: string) {
    const plan = await this.prisma.profileRebasePlan.findUnique({
      where: { id: rebasePlanId },
      include: {
        oldBaselineProfileVersion: true,
        newBaselineProfileVersion: true,
      },
    });
    if (!plan) throw new NotFoundException(`Rebase plan ${rebasePlanId} not found`);

    const analysis = this.impact.analyze(
      plan.oldBaselineProfileVersion.schemaSnapshot,
      plan.newBaselineProfileVersion.schemaSnapshot,
    );

    const status = analysis.impactLevel === 'BLOCKING' ? 'BLOCKED' : 'READY';

    return this.prisma.profileRebasePlan.update({
      where: { id: rebasePlanId },
      data: {
        impactLevel: analysis.impactLevel as any,
        status: status as any,
        impactSummary: {
          impactLevel: analysis.impactLevel,
          summary: analysis.summary,
        } as any,
      },
      include: {
        oldBaselineProfileVersion: true,
        newBaselineProfileVersion: true,
      },
    });
  }

  private async computeUpdateStatus(
    workspaceId: string,
    pinned: {
      id: string;
      profileFamilyId: string;
      baselineProfileVersion: { status: string };
      effectiveSchemaSnapshot: unknown;
      schemaHash: string;
    } | null,
    direction: 'SOURCE' | 'TARGET',
    integrationId: string,
  ) {
    if (!pinned) {
      return { updateStatus: 'REVIEW_REQUIRED', impactLevel: 'WARNING' as const };
    }

    if (String(pinned.baselineProfileVersion.status) === 'END_OF_SUPPORT') {
      await this.createNotice({
        workspaceId,
        integrationDefId: integrationId,
        direction,
        pinnedEffectiveProfileVersionId: pinned.id,
        latestEffectiveProfileVersionId: null,
        impactLevel: 'BLOCKING',
        status: 'OPEN',
        summary: 'Pinned profile is end-of-support',
        blockingReason: 'End of support reached for pinned baseline profile version',
        details: null,
      });
      return { updateStatus: 'END_OF_SUPPORT', impactLevel: 'BLOCKING' as const };
    }

    const latest = await this.prisma.effectiveProfileVersion.findFirst({
      where: {
        profileFamilyId: pinned.profileFamilyId,
        status: 'ACTIVE' as any,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
      orderBy: [{ workspaceId: 'desc' as const }, { publishedAt: 'desc' as const }, { createdAt: 'desc' as const }],
      select: {
        id: true,
        effectiveSchemaSnapshot: true,
      },
    });

    if (!latest || latest.id === pinned.id) {
      return { updateStatus: 'UP_TO_DATE', impactLevel: 'NO_IMPACT' as const };
    }

    const analysis = this.impact.analyze(pinned.effectiveSchemaSnapshot, latest.effectiveSchemaSnapshot);
    const updateStatus = analysis.impactLevel === 'BLOCKING' ? 'REVIEW_REQUIRED' : 'UPDATE_AVAILABLE';

    const notice = await this.createNotice({
      workspaceId,
      integrationDefId: integrationId,
      direction,
      pinnedEffectiveProfileVersionId: pinned.id,
      latestEffectiveProfileVersionId: latest.id,
      impactLevel: analysis.impactLevel,
      status: 'OPEN',
      summary: `${direction} profile update available`,
      blockingReason: analysis.impactLevel === 'BLOCKING' ? 'Profile change introduces breaking impact' : null,
      details: {
        impactLevel: analysis.impactLevel,
        summary: analysis.summary,
      },
    });

    if (analysis.changes.length > 0) {
      await this.prisma.profileImpactChange.createMany({
        data: analysis.changes.map((c) => ({
          noticeId: notice.id,
          changeType: c.changeType as any,
          fieldPath: c.fieldPath,
          oldValue: c.oldValue ?? null,
          newValue: c.newValue ?? null,
          impactLevel: c.impactLevel as any,
        })),
      });
    }

    return { updateStatus, impactLevel: analysis.impactLevel };
  }

  private async createNotice(data: {
    workspaceId: string;
    integrationDefId: string;
    direction: 'SOURCE' | 'TARGET';
    pinnedEffectiveProfileVersionId: string | null;
    latestEffectiveProfileVersionId: string | null;
    impactLevel: 'NO_IMPACT' | 'INFORMATIONAL' | 'WARNING' | 'BLOCKING';
    status: 'OPEN';
    summary: string;
    blockingReason: string | null;
    details: Record<string, unknown> | null;
  }) {
    const existing = await this.prisma.profileUpdateNotice.findFirst({
      where: {
        workspaceId: data.workspaceId,
        integrationDefId: data.integrationDefId,
        direction: data.direction as any,
        pinnedEffectiveProfileVersionId: data.pinnedEffectiveProfileVersionId,
        latestEffectiveProfileVersionId: data.latestEffectiveProfileVersionId,
        status: 'OPEN' as any,
      },
    });
    if (existing) return existing;

    return this.prisma.profileUpdateNotice.create({
      data: {
        workspaceId: data.workspaceId,
        integrationDefId: data.integrationDefId,
        direction: data.direction as any,
        pinnedEffectiveProfileVersionId: data.pinnedEffectiveProfileVersionId,
        latestEffectiveProfileVersionId: data.latestEffectiveProfileVersionId,
        impactLevel: data.impactLevel as any,
        status: data.status as any,
        summary: data.summary,
        blockingReason: data.blockingReason,
        details: data.details as any,
      },
    });
  }

  private async findFamilyIdFromSchemaBinding(
    schemaPacks: Array<{ role: string; schemaPack: { system: string; object: string } }>,
    role: 'SOURCE' | 'TARGET',
  ): Promise<string | null> {
    const binding = schemaPacks.find((sp) => sp.role === role);
    if (!binding) return null;

    const family = await this.prisma.profileFamily.findFirst({
      where: {
        direction: role as any,
        system: binding.schemaPack.system,
        interfaceName: binding.schemaPack.object,
      },
      select: { id: true },
    });
    return family?.id ?? null;
  }

  private hashSchema(schema: unknown): string {
    const stable = JSON.stringify(schema ?? {});
    let hash = 0;
    for (let i = 0; i < stable.length; i += 1) {
      hash = (hash << 5) - hash + stable.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16);
  }
}
