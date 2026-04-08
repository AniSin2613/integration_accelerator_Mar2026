import { Controller, Get, Post, Patch, Param, Body, Delete, UseGuards } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(
    @Body() body: { workspaceId?: string; workspaceSlug?: string; templateDefId: string; name: string; createdBy?: string },
  ) {
    return this.service.createFromTemplate(body);
  }

  @Patch(':id/draft')
  saveDraft(
    @Param('id') id: string,
    @Body() body: {
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
    },
  ) {
    return this.service.saveDraft(id, body);
  }

  @Patch(':id/target-profile')
  setTargetProfile(
    @Param('id') id: string,
    @Body() body: { targetProfileId: string | null },
  ) {
    return this.service.setTargetProfile(id, body.targetProfileId);
  }

  @Get(':id/readiness')
  computeReadiness(@Param('id') id: string) {
    return this.service.computeReadiness(id);
  }

  @Post(':id/ready-for-review')
  markReadyForReview(@Param('id') id: string) {
    return this.service.markReadyForReview(id);
  }

  @Post(':id/increment-version')
  incrementDraftVersion(@Param('id') id: string) {
    return this.service.incrementDraftVersion(id);
  }

  @Post(':id/test-run')
  testRun(
    @Param('id') id: string,
    @Body()
    body: {
      dryRun?: boolean;
      step?: string;
      targetType?: 'JSON' | 'XML';
      targetName?: string;
      targetMode?: 'success' | 'error';
      simulatedResponse?: { statusCode?: number; body?: unknown; headers?: Record<string, string> };
    },
  ) {
    return this.service.startTestRun(id, body);
  }

  @Get(':id/test-run/:testRunId')
  getTestRunStatus(
    @Param('id') id: string,
    @Param('testRunId') testRunId: string,
  ) {
    return this.service.getTestRunStatus(id, testRunId);
  }

  @Get(':id/preview-payloads')
  previewPayloads(@Param('id') id: string) {
    return this.service.previewPayloads(id);
  }

  @Post(':id/generate-yaml')
  generateYaml(@Param('id') id: string) {
    return this.service.generateYaml(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
