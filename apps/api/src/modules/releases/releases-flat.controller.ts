import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ReleasesService } from './releases.service';
import { SubmitApprovalDto } from './dto/submit-approval.dto';
import { AuthGuard } from '../../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('integrations/:integrationId/releases')
export class ReleasesFlatController {
  constructor(private readonly service: ReleasesService) {}

  @Get()
  findAll(@Param('integrationId') integrationId: string) {
    return this.service.findByIntegration(integrationId);
  }

  @Post()
  create(@Param('integrationId') integrationId: string, @Body() body: { version?: string } = {}) {
    return this.service.createArtifactByIntegrationId(integrationId, body);
  }

  @Post(':artifactId/submit')
  submit(@Param('artifactId') artifactId: string, @Body() dto: SubmitApprovalDto) {
    return this.service.submitForApproval(artifactId, 'stub-user', dto);
  }

  @Post(':artifactId/approve')
  approve(@Param('artifactId') artifactId: string) {
    return this.service.approve(artifactId, 'stub-user');
  }

  @Post(':artifactId/promote-next')
  promoteNext(@Param('artifactId') artifactId: string) {
    return this.service.promoteNext(artifactId, 'stub-user');
  }
}
