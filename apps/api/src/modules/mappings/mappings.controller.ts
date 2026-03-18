import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { MappingsService } from './mappings.service';
import { CreateMappingSetDto } from './dto/create-mapping-set.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('integrations/:integrationId/mappings')
export class MappingsController {
  constructor(private readonly service: MappingsService) {}

  @Get()
  findAll(@Param('integrationId') integrationId: string) {
    return this.service.findByIntegration(integrationId);
  }

  @Get('latest')
  findLatest(@Param('integrationId') integrationId: string) {
    return this.service.findLatest(integrationId);
  }

  @Post()
  create(@Param('integrationId') integrationId: string, @Body() dto: CreateMappingSetDto) {
    return this.service.create(integrationId, dto);
  }

  // Rules are approved/rejected individually before the whole set is approved
  @Post('sets/:setId/approve')
  approveSet(@Param('setId') setId: string) {
    // Stub user ID until real auth is in place
    return this.service.approveMappingSet(setId, 'stub-user');
  }

  @Post('rules/:ruleId/approve')
  approveRule(@Param('ruleId') ruleId: string) {
    return this.service.approveRule(ruleId, 'stub-user');
  }

  @Post('rules/:ruleId/reject')
  rejectRule(@Param('ruleId') ruleId: string) {
    return this.service.rejectRule(ruleId);
  }
}
