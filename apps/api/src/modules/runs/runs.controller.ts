import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { RunsService } from './runs.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

@UseGuards(AuthGuard)
@Controller('environments/:environmentId/runs')
export class RunsController {
  constructor(private readonly service: RunsService) {}

  @Get()
  findAll(@Param('environmentId') environmentId: string) {
    return this.service.findByEnvironment(environmentId);
  }

  @Get('health')
  health(@Param('environmentId') environmentId: string) {
    return this.service.getHealthSummary(environmentId);
  }

  @Get(':runId')
  findOne(@Param('runId') runId: string) {
    return this.service.findOne(runId);
  }

  @Post(':runId/replay')
  replay(@Param('runId') runId: string, @CurrentUser() user: RequestUser) {
    return this.service.requestReplay(runId, user.userId);
  }
}
