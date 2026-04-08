import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  getSummary(@Query('workspaceId') workspaceId?: string) {
    return this.service.getSummary(workspaceId);
  }

  @Get('search')
  search(
    @Query('q') query: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    if (!query || query.trim().length === 0) {
      return { integrations: [], connections: [], templates: [] };
    }
    return this.service.search(query.trim(), workspaceId);
  }

  @Get('notifications')
  getNotifications(
    @Query('workspaceId') workspaceId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Math.min(Math.max(parseInt(limit ?? '20', 10) || 20, 1), 100);
    return this.service.getNotifications(workspaceId, parsedLimit);
  }
}
