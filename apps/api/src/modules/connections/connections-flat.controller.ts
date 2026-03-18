import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('connections')
export class ConnectionsFlatController {
  constructor(private readonly service: ConnectionsService) {}

  @Get()
  findAll(@Query('slug') slug?: string) {
    return this.service.findAllFlat(slug);
  }

  @Post(':connectionId/test')
  test(@Param('connectionId') connectionId: string) {
    return this.service.testConnectionDefault(connectionId);
  }
}
