import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { AssignMembershipDto } from './dto/assign-membership.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('workspaces/:workspaceId/memberships')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Get()
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.service.findByWorkspace(workspaceId);
  }

  @Post()
  assign(@Param('workspaceId') workspaceId: string, @Body() dto: AssignMembershipDto) {
    return this.service.assign(workspaceId, dto);
  }

  @Delete(':userId')
  remove(@Param('workspaceId') workspaceId: string, @Param('userId') userId: string) {
    return this.service.remove(workspaceId, userId);
  }
}
