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
    return this.service.findByWorkspace(workspaceId, limit ? parseInt(limit, 10) : 50);
  }
}
