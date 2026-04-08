import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateTargetProfileDto, UpdateTargetProfileDto } from './dto/target-profile.dto';
import { CreateTargetProfileFieldDto, UpdateTargetProfileFieldDto } from './dto/target-profile-field.dto';
import { CreateOverlayDto, UpdateOverlayDto } from './dto/overlay.dto';
import { PublishVersionDto } from './dto/publish-version.dto';
import * as crypto from 'crypto';

@Injectable()
export class TargetProfilesService {
  private readonly logger = new Logger(TargetProfilesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Profile CRUD ────────────────────────────────────────────────────────────

  /** List all target profiles with field counts. */
  async findAll() {
    return this.prisma.targetProfile.findMany({
      include: {
        schemaPack: { select: { id: true, name: true, system: true, object: true, version: true } },
        _count: { select: { fields: true, overlays: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /** Full profile detail including fields, overlays, and current version. */
  async findOne(id: string) {
    const profile = await this.prisma.targetProfile.findUnique({
      where: { id },
      include: {
        schemaPack: { include: { fields: { orderBy: { path: 'asc' } } } },
        fields: { orderBy: { sortOrder: 'asc' } },
        overlays: { orderBy: { createdAt: 'desc' } },
        currentVersion: true,
      },
    });
    if (!profile) throw new NotFoundException(`Target profile ${id} not found`);
    return profile;
  }

  /** Create a new target profile. */
  async create(dto: CreateTargetProfileDto) {
    // Verify the schema pack exists
    const schemaPack = await this.prisma.schemaPack.findUnique({
      where: { id: dto.schemaPackId },
      include: { fields: { orderBy: { path: 'asc' } } },
    });
    if (!schemaPack) throw new NotFoundException(`Schema pack ${dto.schemaPackId} not found`);

    const profile = await this.prisma.$transaction(async (tx) => {
      const family = await tx.profileFamily.upsert({
        where: {
          direction_system_interfaceName: {
            direction: 'TARGET',
            system: dto.system,
            interfaceName: dto.object,
          },
        },
        update: {
          object: dto.object,
        },
        create: {
          direction: 'TARGET',
          system: dto.system,
          interfaceName: dto.object,
          object: dto.object,
          platformOwned: true,
        },
      });

      return tx.targetProfile.create({
        data: {
          schemaPackId: dto.schemaPackId,
          system: dto.system,
          object: dto.object,
          name: dto.name,
          description: dto.description,
          profileFamilyId: family.id,
          fields: {
            create: schemaPack.fields.map((f, i) => ({
              path: f.path,
              dataType: f.dataType,
              required: f.required,
              description: f.description,
              example: f.example,
              sortOrder: i,
            })),
          },
        },
        include: {
          schemaPack: { select: { id: true, name: true, system: true, object: true, version: true } },
          fields: { orderBy: { sortOrder: 'asc' } },
          _count: { select: { fields: true, overlays: true } },
        },
      });
    });

    return profile;
  }

  /** Update profile metadata. */
  async update(id: string, dto: UpdateTargetProfileDto) {
    await this.assertExists(id);
    return this.prisma.targetProfile.update({
      where: { id },
      data: dto,
      include: {
        schemaPack: { select: { id: true, name: true, system: true, object: true, version: true } },
        _count: { select: { fields: true, overlays: true } },
      },
    });
  }

  /** Delete a target profile and all related data. */
  async remove(id: string) {
    await this.assertExists(id);
    // Prisma cascades handle fields, overlays, versions, drift suggestions
    return this.prisma.targetProfile.delete({ where: { id } });
  }

  // ── Field CRUD ──────────────────────────────────────────────────────────────

  /** Add a custom field to a profile. */
  async createField(profileId: string, dto: CreateTargetProfileFieldDto) {
    await this.assertExists(profileId);
    return this.prisma.targetProfileField.create({
      data: { targetProfileId: profileId, ...dto },
    });
  }

  /** Update a profile field. */
  async updateField(fieldId: string, dto: UpdateTargetProfileFieldDto) {
    const field = await this.prisma.targetProfileField.findUnique({ where: { id: fieldId } });
    if (!field) throw new NotFoundException(`Profile field ${fieldId} not found`);
    return this.prisma.targetProfileField.update({
      where: { id: fieldId },
      data: dto,
    });
  }

  /** Delete a profile field. */
  async removeField(fieldId: string) {
    const field = await this.prisma.targetProfileField.findUnique({ where: { id: fieldId } });
    if (!field) throw new NotFoundException(`Profile field ${fieldId} not found`);
    return this.prisma.targetProfileField.delete({ where: { id: fieldId } });
  }

  // ── Overlay CRUD ────────────────────────────────────────────────────────────

  /** Add an overlay to a profile. */
  async createOverlay(profileId: string, dto: CreateOverlayDto) {
    await this.assertExists(profileId);
    return this.prisma.targetProfileOverlay.create({
      data: {
        targetProfileId: profileId,
        overlayType: dto.overlayType,
        config: dto.config as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    });
  }

  /** Update an overlay. */
  async updateOverlay(overlayId: string, dto: UpdateOverlayDto) {
    const overlay = await this.prisma.targetProfileOverlay.findUnique({ where: { id: overlayId } });
    if (!overlay) throw new NotFoundException(`Overlay ${overlayId} not found`);
    return this.prisma.targetProfileOverlay.update({
      where: { id: overlayId },
      data: {
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.config && { config: dto.config as Prisma.InputJsonValue }),
      },
    });
  }

  /** Delete an overlay. */
  async removeOverlay(overlayId: string) {
    const overlay = await this.prisma.targetProfileOverlay.findUnique({ where: { id: overlayId } });
    if (!overlay) throw new NotFoundException(`Overlay ${overlayId} not found`);
    return this.prisma.targetProfileOverlay.delete({ where: { id: overlayId } });
  }

  // ── Publish ──────────────────────────────────────────────────────────────────

  /**
   * Publish a new immutable version of the target profile.
   * Snapshots the current fields + active overlays into JSON,
   * creates a TargetProfileVersion, and sets it as currentVersion.
   */
  async publish(id: string, dto: PublishVersionDto) {
    const profile = await this.prisma.targetProfile.findUnique({
      where: { id },
      include: {
        fields: { orderBy: { sortOrder: 'asc' } },
        overlays: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
        schemaPack: { select: { id: true, name: true, system: true, object: true, version: true } },
      },
    });
    if (!profile) throw new NotFoundException(`Target profile ${id} not found`);

    // Ensure version doesn't already exist
    const existing = await this.prisma.targetProfileVersion.findUnique({
      where: { targetProfileId_version: { targetProfileId: id, version: dto.version } },
    });
    if (existing) throw new ConflictException(`Version ${dto.version} already exists for this profile`);

    // Build the immutable snapshot
    const snapshot = {
      profileId: profile.id,
      name: profile.name,
      system: profile.system,
      object: profile.object,
      description: profile.description,
      schemaPack: profile.schemaPack,
      fields: profile.fields.map((f) => ({
        path: f.path,
        dataType: f.dataType,
        required: f.required,
        businessName: f.businessName,
        description: f.description,
        validationRule: f.validationRule,
        defaultValue: f.defaultValue,
        example: f.example,
        sortOrder: f.sortOrder,
      })),
      overlays: profile.overlays.map((o) => ({
        overlayType: o.overlayType,
        config: o.config,
      })),
    };

    const schemaHash = crypto.createHash('sha256').update(JSON.stringify(snapshot)).digest('hex').slice(0, 16);

    // Create version and update profile in a transaction
    const version = await this.prisma.$transaction(async (tx) => {
      let profileFamilyId = profile.profileFamilyId;
      if (!profileFamilyId) {
        const family = await tx.profileFamily.upsert({
          where: {
            direction_system_interfaceName: {
              direction: 'TARGET',
              system: profile.system,
              interfaceName: profile.object,
            },
          },
          update: {
            object: profile.object,
          },
          create: {
            direction: 'TARGET',
            system: profile.system,
            interfaceName: profile.object,
            object: profile.object,
            platformOwned: true,
          },
        });
        profileFamilyId = family.id;
      }

      await tx.profileVersion.updateMany({
        where: {
          profileFamilyId,
          status: 'CURRENT' as any,
        },
        data: {
          status: 'DEPRECATED' as any,
          deprecatedAt: new Date(),
          endOfSupportAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
      });

      const baselineVersion = await tx.profileVersion.create({
        data: {
          profileFamilyId,
          version: dto.version,
          status: 'CURRENT' as any,
          schemaSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          schemaHash,
          publishedAt: new Date(),
        },
      });

      await tx.effectiveProfileVersion.updateMany({
        where: {
          profileFamilyId,
          workspaceId: null,
          status: 'ACTIVE' as any,
        },
        data: {
          status: 'SUPERSEDED' as any,
        },
      });

      await tx.effectiveProfileVersion.create({
        data: {
          profileFamilyId,
          baselineProfileVersionId: baselineVersion.id,
          workspaceId: null,
          status: 'ACTIVE' as any,
          effectiveSchemaSnapshot: snapshot as unknown as Prisma.InputJsonValue,
          schemaHash,
          publishedAt: new Date(),
        },
      });

      const created = await tx.targetProfileVersion.create({
        data: {
          targetProfileId: id,
          version: dto.version,
          snapshotJson: snapshot as unknown as Prisma.InputJsonValue,
        },
      });

      await tx.targetProfile.update({
        where: { id },
        data: {
          currentVersionId: created.id,
          profileFamilyId,
          isPublished: true,
        },
      });

      return created;
    });

    this.logger.log(`Published target profile ${id} as v${dto.version}`);
    return version;
  }

  // ── Version + Drift ─────────────────────────────────────────────────────────

  /** List published versions for a profile, newest first. */
  async findVersions(id: string) {
    await this.assertExists(id);
    return this.prisma.targetProfileVersion.findMany({
      where: { targetProfileId: id },
      orderBy: { publishedAt: 'desc' },
    });
  }

  /** Get a single version with its snapshot. */
  async findVersionDetail(versionId: string) {
    const version = await this.prisma.targetProfileVersion.findUnique({
      where: { id: versionId },
    });
    if (!version) throw new NotFoundException(`Version ${versionId} not found`);
    return version;
  }

  /** List drift suggestions for a profile. */
  async findDriftSuggestions(id: string) {
    await this.assertExists(id);
    return this.prisma.driftSuggestion.findMany({
      where: { targetProfileId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async assertExists(id: string) {
    const exists = await this.prisma.targetProfile.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException(`Target profile ${id} not found`);
  }
}
