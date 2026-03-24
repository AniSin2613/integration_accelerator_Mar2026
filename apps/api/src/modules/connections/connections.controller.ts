import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { BindConnectionDto } from './dto/bind-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('workspaces/:workspaceId/connections')
export class ConnectionsController {
  constructor(private readonly service: ConnectionsService) {}

  @Get()
  findAll(@Param('workspaceId') workspaceId: string) {
    return this.service.findByWorkspace(workspaceId);
  }

  @Get(':connectionId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('connectionId') connectionId: string,
  ) {
    return this.service.findOne(workspaceId, connectionId);
  }

  @Post()
  create(@Param('workspaceId') workspaceId: string, @Body() dto: CreateConnectionDto) {
    return this.service.create(workspaceId, dto);
  }

  @Patch(':connectionId')
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('connectionId') connectionId: string,
    @Body() dto: UpdateConnectionDto,
  ) {
    return this.service.update(workspaceId, connectionId, dto);
  }

  @Post(':connectionId/bindings/:environmentId')
  bindToEnvironment(
    @Param('connectionId') connectionId: string,
    @Param('environmentId') environmentId: string,
    @Body() dto: BindConnectionDto,
  ) {
    return this.service.bindToEnvironment(connectionId, environmentId, dto);
  }

  @Post(':connectionId/test/:environmentId')
  test(
    @Param('connectionId') connectionId: string,
    @Param('environmentId') environmentId: string,
  ) {
    return this.service.testConnection(connectionId, environmentId);
  }
}
