import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('templates')
export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':templateId')
  findOne(@Param('templateId') templateId: string) {
    return this.service.findOne(templateId);
  }

  @Get(':templateId/latest-version')
  findLatestVersion(@Param('templateId') templateId: string) {
    return this.service.findLatestVersion(templateId);
  }
}
