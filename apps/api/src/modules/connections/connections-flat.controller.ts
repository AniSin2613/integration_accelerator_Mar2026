import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ConnectionsService } from './connections.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { TestConnectionDto } from './dto/test-connection.dto';

@UseGuards(AuthGuard)
@Controller('connections')
export class ConnectionsFlatController {
  constructor(private readonly service: ConnectionsService) {}

  @Get()
  findAll(@Query('slug') slug?: string) {
    if (!slug) {
      throw new BadRequestException('slug query parameter is required to scope connections to a workspace');
    }
    return this.service.findAllFlat(slug);
  }

  @Get(':connectionId')
  findOne(@Param('connectionId') connectionId: string) {
    return this.service.findOneFlat(connectionId);
  }

  @Post()
  create(@Body() dto: CreateConnectionDto) {
    return this.service.createFlat(dto);
  }

  @Patch(':connectionId')
  update(@Param('connectionId') connectionId: string, @Body() dto: UpdateConnectionDto) {
    return this.service.updateFlat(connectionId, dto);
  }

  @Post(':connectionId/test')
  test(@Param('connectionId') connectionId: string, @Body() dto: TestConnectionDto) {
    return this.service.testConnectionDefault(connectionId, dto.environmentId);
  }

  @Delete(':connectionId')
  remove(@Param('connectionId') connectionId: string) {
    return this.service.softDeleteFlat(connectionId);
  }
}
