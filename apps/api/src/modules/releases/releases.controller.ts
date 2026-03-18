import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ReleasesService } from './releases.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { SubmitApprovalDto } from './dto/submit-approval.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('workspaces/:workspaceId/integrations/:integrationId/releases')
export class ReleasesController {
  constructor(private readonly service: ReleasesService) {}

  @Get()
  findAll(@Param('integrationId') integrationId: string) {
    return this.service.findByIntegration(integrationId);
  }

  @Post()
  create(
    @Param('workspaceId') workspaceId: string,
    @Param('integrationId') integrationId: string,
    @Body() dto: CreateReleaseDto,
  ) {
    return this.service.createArtifact(workspaceId, integrationId, dto);
  }

  @Post(':artifactId/submit')
  submit(@Param('artifactId') artifactId: string, @Body() dto: SubmitApprovalDto) {
    return this.service.submitForApproval(artifactId, 'stub-user', dto);
  }

  @Post(':artifactId/approve')
  approve(@Param('artifactId') artifactId: string) {
    return this.service.approve(artifactId, 'stub-user');
  }

  @Post(':artifactId/promote/:environmentId')
  promote(@Param('artifactId') artifactId: string, @Param('environmentId') environmentId: string) {
    return this.service.promote(artifactId, environmentId, 'stub-user');
  }
}
