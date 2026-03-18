import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('tenants/:tenantId/workspaces')
export class WorkspacesController {
  constructor(private readonly service: WorkspacesService) {}

  @Get()
  findAll(@Param('tenantId') tenantId: string) {
    return this.service.findByTenant(tenantId);
  }

  @Get(':workspaceId')
  findOne(@Param('tenantId') tenantId: string, @Param('workspaceId') workspaceId: string) {
    return this.service.findOne(tenantId, workspaceId);
  }

  @Post()
  create(@Param('tenantId') tenantId: string, @Body() dto: CreateWorkspaceDto) {
    return this.service.create(tenantId, dto);
  }
}
