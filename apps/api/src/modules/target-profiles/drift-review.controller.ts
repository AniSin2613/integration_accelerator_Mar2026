import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { DriftDetectionService } from './drift-detection.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { DriftSuggestionStatus } from '@prisma/client';

@UseGuards(AuthGuard)
@Controller('drift-review')
export class DriftReviewController {
  constructor(private readonly drift: DriftDetectionService) {}

  /**
   * GET /drift-review — list drift suggestions across all profiles.
   * Supports filtering by status, system, object, targetProfileId.
   */
  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('system') system?: string,
    @Query('object') object?: string,
    @Query('targetProfileId') targetProfileId?: string,
  ) {
    return this.drift.findSuggestions({
      status: status as DriftSuggestionStatus | undefined,
      system,
      object,
      targetProfileId,
    });
  }

  /** GET /drift-review/counts/:targetProfileId — status counts for a profile */
  @Get('counts/:targetProfileId')
  getCounts(@Param('targetProfileId') targetProfileId: string) {
    return this.drift.getSuggestionCounts(targetProfileId);
  }

  /** GET /drift-review/:id — single suggestion detail with effective field state */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.drift.findSuggestionDetail(id);
  }

  /** PATCH /drift-review/:id/in-review — move to IN_REVIEW status */
  @Patch(':id/in-review')
  markInReview(
    @Param('id') id: string,
    @Body() body: { reviewerId: string },
  ) {
    return this.drift.markInReview(id, body.reviewerId);
  }

  /** POST /drift-review/:id/approve — approve and create overlay */
  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @Body() body: { reviewerId: string; note?: string },
  ) {
    return this.drift.approve(id, body.reviewerId, body.note);
  }

  /** POST /drift-review/:id/reject — reject and preserve evidence */
  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() body: { reviewerId: string; note?: string },
  ) {
    return this.drift.reject(id, body.reviewerId, body.note);
  }

  /** POST /drift-review/:id/convert-conditional — convert to conditional overlay */
  @Post(':id/convert-conditional')
  convertToConditional(
    @Param('id') id: string,
    @Body() body: { reviewerId: string; note?: string },
  ) {
    return this.drift.convertToConditional(id, body.reviewerId, body.note);
  }

  /**
   * POST /drift-review/process-runtime-errors — normalize + detect + create suggestions.
   * Called by the test-run flow or runtime error capture.
   */
  @Post('process-runtime-errors')
  processRuntimeErrors(
    @Body() body: {
      targetProfileId: string;
      rawResponse: { statusCode?: number; body?: unknown; headers?: Record<string, string> };
      environment?: string;
      requestRef?: string;
      responseRef?: string;
      sourceRunRef?: string;
    },
  ) {
    return this.drift.processRuntimeErrors(body);
  }
}
