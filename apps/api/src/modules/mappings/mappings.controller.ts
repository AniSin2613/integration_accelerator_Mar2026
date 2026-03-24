import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { MappingsService } from './mappings.service';
import { CreateMappingSetDto } from './dto/create-mapping-set.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

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

  @Post('sets/:setId/approve')
  approveSet(@Param('setId') setId: string, @CurrentUser() user: RequestUser) {
    return this.service.approveMappingSet(setId, user.userId);
  }

  @Post('rules/:ruleId/approve')
  approveRule(@Param('ruleId') ruleId: string, @CurrentUser() user: RequestUser) {
    return this.service.approveRule(ruleId, user.userId);
  }

  @Post('rules/:ruleId/reject')
  rejectRule(@Param('ruleId') ruleId: string) {
    return this.service.rejectRule(ruleId);
  }
}
