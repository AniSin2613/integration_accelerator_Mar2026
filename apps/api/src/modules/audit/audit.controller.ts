import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('workspaces/:workspaceId/audit')
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  findAll(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
  ) {
    const safeLimit = Math.min(Math.max(parseInt(limit ?? '50', 10) || 50, 1), 200);
    return this.service.findByWorkspace(workspaceId, safeLimit);
  }
}
