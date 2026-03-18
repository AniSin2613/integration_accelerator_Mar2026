import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RunsService } from './runs.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('runs')
export class RunsFlatController {
  constructor(private readonly service: RunsService) {}

  @Get()
  findRecent(@Query('limit') limit?: string) {
    const safeLimit = Math.min(Number(limit ?? 20) || 20, 100);
    return this.service.findRecent(safeLimit);
  }

  @Get('health-latest')
  latestHealth() {
    return this.service.getLatestHealthAcrossEnvironments();
  }
}
