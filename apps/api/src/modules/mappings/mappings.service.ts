import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateMappingSetDto } from './dto/create-mapping-set.dto';
import { MappingEvidenceSource } from '@cogniviti/domain';
import { AuditService } from '../audit/audit.service';

const ALLOWED_EVIDENCE_SOURCES = new Set(Object.values(MappingEvidenceSource));

@Injectable()
export class MappingsService {
  private readonly logger = new Logger(MappingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findByIntegration(integrationDefId: string) {
    const sets = await this.prisma.mappingSet.findMany({
      where: { integrationDefId },
      include: { rules: { orderBy: { sourceField: 'asc' } } },
      orderBy: { version: 'desc' },
    });

    return sets.map((set) => expandEvidenceSourcesOnSet(set));
  }

  async findLatest(integrationDefId: string) {
    const set = await this.prisma.mappingSet.findFirst({
      where: { integrationDefId },
      include: { rules: { orderBy: { sourceField: 'asc' } } },
      orderBy: { version: 'desc' },
    });
    if (!set) throw new NotFoundException('No mapping set found');
    return expandEvidenceSourcesOnSet(set);
  }

  async create(integrationDefId: string, dto: CreateMappingSetDto) {
    // Determine next version number
    const latest = await this.prisma.mappingSet.findFirst({
      where: { integrationDefId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (latest?.version ?? 0) + 1;

    const created = await this.prisma.mappingSet.create({
      data: {
        integrationDefId,
        version: nextVersion,
        rules: {
          create: dto.rules.map((r) => {
            const evidenceSources = normalizeEvidenceSources(r.aiEvidenceSources, r.aiEvidenceSource);

            // Zero-trust rule: AI-proposed mappings must carry provenance categories.
            if (r.aiConfidence !== undefined && evidenceSources.length === 0) {
              throw new BadRequestException(
                'AI-suggested mapping rules require at least one approved evidence source',
              );
            }

            return {
              sourceField: r.sourceField,
              targetField: r.targetField,
              mappingType: r.mappingType ?? 'DIRECT',
              transformConfig: mergeEvidenceMetadata(r.transformConfig, r.aiEvidenceReferences) as Prisma.InputJsonValue | undefined,
              // All new rules start as PENDING_REVIEW regardless of source
              status: 'PENDING_REVIEW',
              aiConfidence: r.aiConfidence,
              aiEvidenceSource:
                evidenceSources.length > 0
                  ? evidenceSources.join('|')
                  : undefined,
              aiExplanation: r.aiExplanation,
            };
          }),
        },
      },
      include: { rules: true },
    });

    return expandEvidenceSourcesOnSet(created);
  }

  /**
   * Approve a single mapping rule.
   * Only humans can move a rule to APPROVED — the API enforces this.
   * AI confidence alone does NOT auto-approve.
   */
  async approveRule(ruleId: string, approvingUserId: string) {
    const rule = await this.prisma.mappingRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException(`Mapping rule ${ruleId} not found`);
    if (rule.status === 'APPROVED') throw new BadRequestException('Rule is already approved');

    const updated = await this.prisma.mappingRule.update({
      where: { id: ruleId },
      data: { status: 'APPROVED' },
    });

    // Audit
    const set = await this.prisma.mappingSet.findUnique({ where: { id: rule.mappingSetId }, select: { integrationDefId: true } });
    this.audit.log({
      tenantId: 'system',
      userId: approvingUserId,
      action: 'MAPPING_APPROVED',
      entityType: 'MappingRule',
      entityId: ruleId,
      details: { integrationDefId: set?.integrationDefId },
    }).catch((err) => this.logger.error('Failed to write audit log for MAPPING_APPROVED', err));

    return updated;
  }

  /**
   * Reject a single mapping rule.
   */
  async rejectRule(ruleId: string) {
    const rule = await this.prisma.mappingRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException(`Mapping rule ${ruleId} not found`);

    const updated = await this.prisma.mappingRule.update({
      where: { id: ruleId },
      data: { status: 'REJECTED' },
    });

    this.audit.log({
      tenantId: 'system',
      action: 'MAPPING_REJECTED',
      entityType: 'MappingRule',
      entityId: ruleId,
    }).catch((err) => this.logger.error('Failed to write audit log for MAPPING_REJECTED', err));

    return updated;
  }

  /**
   * Approve an entire mapping set.
   * All rules must be individually approved first.
   * Creates an immutable snapshot.
   */
  async approveMappingSet(mappingSetId: string, approvingUserId: string) {
    const set = await this.prisma.mappingSet.findUnique({
      where: { id: mappingSetId },
      include: { rules: true },
    });
    if (!set) throw new NotFoundException(`Mapping set ${mappingSetId} not found`);

    const unapproved = set.rules.filter((r) => r.status !== 'APPROVED');
    if (unapproved.length > 0) {
      throw new ForbiddenException(
        `${unapproved.length} rule(s) still pending review. All rules must be individually approved before the set can be approved.`,
      );
    }

    // Capture immutable snapshot
    const snapshot = { version: set.version, rules: set.rules, approvedAt: new Date().toISOString() };

    return this.prisma.mappingSet.update({
      where: { id: mappingSetId },
      data: {
        isApproved: true,
        approvedAt: new Date(),
        approvedByUserId: approvingUserId,
        snapshotJson: snapshot,
      },
      include: { rules: true },
    });
  }
}

function mergeEvidenceMetadata(
  transformConfig: Record<string, unknown> | undefined,
  aiEvidenceReferences?: string[],
): Record<string, unknown> | undefined {
  if (!aiEvidenceReferences || aiEvidenceReferences.length === 0) return transformConfig;
  return {
    ...(transformConfig ?? {}),
    aiEvidenceReferences,
  };
}

function normalizeEvidenceSources(
  sources?: MappingEvidenceSource[],
  legacySource?: string,
): MappingEvidenceSource[] {
  const out: MappingEvidenceSource[] = [];

  if (Array.isArray(sources)) {
    for (const source of sources) {
      if (!ALLOWED_EVIDENCE_SOURCES.has(source)) {
        throw new BadRequestException(`Unsupported aiEvidenceSource: ${source}`);
      }
      out.push(source);
    }
  }

  if (legacySource) {
    const rawTokens = legacySource.split(/[|,]/).map((t) => t.trim()).filter(Boolean);
    for (const token of rawTokens) {
      const normalized = mapLegacyEvidenceToken(token);
      if (!normalized || !ALLOWED_EVIDENCE_SOURCES.has(normalized)) {
        throw new BadRequestException(`Unsupported aiEvidenceSource: ${token}`);
      }
      out.push(normalized);
    }
  }

  return Array.from(new Set(out));
}

function mapLegacyEvidenceToken(token: string): MappingEvidenceSource | null {
  const upper = token.toUpperCase();
  const aliases: Record<string, MappingEvidenceSource> = {
    INTERNAL_MAPPING_LIBRARY: MappingEvidenceSource.INTERNAL_APPROVED,
    INTERNAL_APPROVED: MappingEvidenceSource.INTERNAL_APPROVED,
    SOURCE_PLATFORM_OFFICIAL_DOCS: MappingEvidenceSource.SOURCE_PLATFORM_OFFICIAL_DOCS,
    TARGET_PLATFORM_OFFICIAL_DOCS: MappingEvidenceSource.TARGET_PLATFORM_OFFICIAL_DOCS,
    OFFICIAL_OPENAPI_SPEC: MappingEvidenceSource.OFFICIAL_OPENAPI_SPEC,
    OFFICIAL_FIELD_DICTIONARY: MappingEvidenceSource.OFFICIAL_FIELD_DICTIONARY,
    CURATED_SCHEMA_PACK: MappingEvidenceSource.CURATED_SCHEMA_PACK,
    CURATED_SCHEMA_PACKS: MappingEvidenceSource.CURATED_SCHEMA_PACK,
  };
  return aliases[upper] ?? null;
}

function expandEvidenceSourcesOnSet(set: { rules: Array<{ aiEvidenceSource: string | null; [key: string]: unknown }>; [key: string]: unknown }) {
  return {
    ...set,
    rules: set.rules.map((rule) => ({
      ...rule,
      aiEvidenceSources: rule.aiEvidenceSource
        ? rule.aiEvidenceSource.split('|').map((s) => s.trim()).filter(Boolean)
        : [],
    })),
  };
}
