import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { ProfileImpactAnalysisService } from './profile-impact-analysis.service';

@Module({
  controllers: [ProfilesController],
  providers: [ProfilesService, ProfileImpactAnalysisService],
  exports: [ProfilesService, ProfileImpactAnalysisService],
})
export class ProfilesModule {}
