import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { TargetProfilesService } from './target-profiles.service';
import { EffectiveSchemaResolverService } from './effective-schema-resolver.service';
import { DriftDetectionService } from './drift-detection.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CreateTargetProfileDto, UpdateTargetProfileDto } from './dto/target-profile.dto';
import { CreateTargetProfileFieldDto, UpdateTargetProfileFieldDto } from './dto/target-profile-field.dto';
import { CreateOverlayDto, UpdateOverlayDto } from './dto/overlay.dto';
import { PublishVersionDto } from './dto/publish-version.dto';

@UseGuards(AuthGuard)
@Controller('target-profiles')
export class TargetProfilesController {
  constructor(
    private readonly service: TargetProfilesService,
    private readonly resolver: EffectiveSchemaResolverService,
    private readonly drift: DriftDetectionService,
  ) {}

  // ── Profile CRUD ────────────────────────────────────────────────────────────

  /** GET /target-profiles — list all profiles */
  @Get()
  findAll() {
    return this.service.findAll();
  }

  /** POST /target-profiles — create a profile */
  @Post()
  create(@Body() dto: CreateTargetProfileDto) {
    return this.service.create(dto);
  }

  /** GET /target-profiles/:id — full profile detail */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  /** PATCH /target-profiles/:id — update profile metadata */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTargetProfileDto) {
    return this.service.update(id, dto);
  }

  /** DELETE /target-profiles/:id — delete profile */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  // ── Effective Schema ────────────────────────────────────────────────────────

  /** GET /target-profiles/:id/effective-schema — resolved schema (base + overlays) */
  @Get(':id/effective-schema')
  resolveEffectiveSchema(@Param('id') id: string) {
    return this.resolver.resolve(id);
  }

  // ── Fields ──────────────────────────────────────────────────────────────────

  /** POST /target-profiles/:id/fields — add a field */
  @Post(':id/fields')
  createField(@Param('id') id: string, @Body() dto: CreateTargetProfileFieldDto) {
    return this.service.createField(id, dto);
  }

  /** PATCH /target-profiles/fields/:fieldId — update a field */
  @Patch('fields/:fieldId')
  updateField(@Param('fieldId') fieldId: string, @Body() dto: UpdateTargetProfileFieldDto) {
    return this.service.updateField(fieldId, dto);
  }

  /** DELETE /target-profiles/fields/:fieldId — delete a field */
  @Delete('fields/:fieldId')
  removeField(@Param('fieldId') fieldId: string) {
    return this.service.removeField(fieldId);
  }

  // ── Overlays ────────────────────────────────────────────────────────────────

  /** POST /target-profiles/:id/overlays — add an overlay */
  @Post(':id/overlays')
  createOverlay(@Param('id') id: string, @Body() dto: CreateOverlayDto) {
    return this.service.createOverlay(id, dto);
  }

  /** PATCH /target-profiles/overlays/:overlayId — update an overlay */
  @Patch('overlays/:overlayId')
  updateOverlay(@Param('overlayId') overlayId: string, @Body() dto: UpdateOverlayDto) {
    return this.service.updateOverlay(overlayId, dto);
  }

  /** DELETE /target-profiles/overlays/:overlayId — delete an overlay */
  @Delete('overlays/:overlayId')
  removeOverlay(@Param('overlayId') overlayId: string) {
    return this.service.removeOverlay(overlayId);
  }

  // ── Versions + Drift ─────────────────────────────────────────────────────────

  /** POST /target-profiles/:id/publish — publish a new immutable version */
  @Post(':id/publish')
  async publish(@Param('id') id: string, @Body() dto: PublishVersionDto) {
    const version = await this.service.publish(id, dto);
    // Auto-detect drift after publishing a new version
    const driftResult = await this.drift.detectDrift(id).catch(() => null);
    return { ...version, driftDetected: driftResult?.created ?? 0 };
  }

  /** GET /target-profiles/:id/versions — version history */
  @Get(':id/versions')
  findVersions(@Param('id') id: string) {
    return this.service.findVersions(id);
  }

  /** GET /target-profiles/versions/:versionId — single version detail with snapshot */
  @Get('versions/:versionId')
  findVersionDetail(@Param('versionId') versionId: string) {
    return this.service.findVersionDetail(versionId);
  }

  /** GET /target-profiles/:id/drift-suggestions — drift suggestions */
  @Get(':id/drift-suggestions')
  findDriftSuggestions(@Param('id') id: string) {
    return this.service.findDriftSuggestions(id);
  }

  /** POST /target-profiles/:id/detect-drift — trigger drift detection */
  @Post(':id/detect-drift')
  detectDrift(@Param('id') id: string) {
    return this.drift.detectDrift(id);
  }

  /** PATCH /target-profiles/drift-suggestions/:suggestionId/apply — mark as applied */
  @Patch('drift-suggestions/:suggestionId/apply')
  applySuggestion(@Param('suggestionId') suggestionId: string) {
    return this.drift.applySuggestion(suggestionId);
  }

  /** DELETE /target-profiles/drift-suggestions/:suggestionId — dismiss a suggestion */
  @Delete('drift-suggestions/:suggestionId')
  dismissSuggestion(@Param('suggestionId') suggestionId: string) {
    return this.drift.dismissSuggestion(suggestionId);
  }
}
