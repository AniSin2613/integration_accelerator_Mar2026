import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { ProfilesService } from './profiles.service';

@UseGuards(AuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly service: ProfilesService) {}

  private assertPlatformAdmin(user: RequestUser) {
    if (user.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Platform Admin role required for baseline profile lifecycle changes');
    }
  }

  private assertCustomerOrPlatformAdmin(user: RequestUser) {
    if (user.role !== 'ADMIN' && user.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Customer Admin or Platform Admin role required');
    }
  }

  @Get('families')
  listFamilies(@Query('direction') direction?: 'SOURCE' | 'TARGET') {
    return this.service.listFamilies(direction);
  }

  @Post('families')
  upsertFamily(
    @Body()
    body: {
      direction: 'SOURCE' | 'TARGET';
      system: string;
      interfaceName: string;
      object?: string;
      platformOwned?: boolean;
    },
    @CurrentUser() user: RequestUser,
  ) {
    this.assertPlatformAdmin(user);
    return this.service.upsertFamily(body);
  }

  @Post('families/:profileFamilyId/versions/publish')
  publishBaselineVersion(
    @Param('profileFamilyId') profileFamilyId: string,
    @Body() body: { version: string; schemaSnapshot: unknown; publishedAt?: string },
    @CurrentUser() user: RequestUser,
  ) {
    this.assertPlatformAdmin(user);
    return this.service.publishBaselineVersion({
      profileFamilyId,
      version: body.version,
      schemaSnapshot: body.schemaSnapshot,
      publishedAt: body.publishedAt,
    });
  }

  @Get('families/:profileFamilyId/versions')
  listBaselineVersions(@Param('profileFamilyId') profileFamilyId: string) {
    return this.service.listBaselineVersions(profileFamilyId);
  }

  @Patch('versions/:versionId/lifecycle')
  transitionBaselineVersion(
    @Param('versionId') versionId: string,
    @Body() body: { status: 'CURRENT' | 'DEPRECATED' | 'END_OF_SUPPORT'; deprecatedAt?: string; endOfSupportAt?: string },
    @CurrentUser() user: RequestUser,
  ) {
    this.assertPlatformAdmin(user);
    return this.service.transitionBaselineVersion(versionId, body);
  }

  @Get('notices')
  listNotices(@Query('workspaceId') workspaceId: string, @Query('integrationDefId') integrationDefId?: string) {
    return this.service.listUpdateNotices(workspaceId, integrationDefId);
  }

  @Patch('notices/:noticeId/acknowledge')
  acknowledgeNotice(@Param('noticeId') noticeId: string, @CurrentUser() user: RequestUser) {
    this.assertCustomerOrPlatformAdmin(user);
    return this.service.acknowledgeNotice(noticeId);
  }

  @Post('rebase-plans')
  createRebasePlan(
    @Body()
    body: {
      workspaceId: string;
      integrationDefId: string;
      direction: 'SOURCE' | 'TARGET';
      newBaselineProfileVersionId: string;
    },
    @CurrentUser() user: RequestUser,
  ) {
    this.assertCustomerOrPlatformAdmin(user);
    return this.service.createRebasePlan(body);
  }

  @Post('rebase-plans/:rebasePlanId/analyze')
  analyzeRebasePlan(@Param('rebasePlanId') rebasePlanId: string, @CurrentUser() user: RequestUser) {
    this.assertCustomerOrPlatformAdmin(user);
    return this.service.analyzeRebasePlan(rebasePlanId);
  }
}
