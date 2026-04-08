import { Module } from '@nestjs/common';
import { TargetProfilesController } from './target-profiles.controller';
import { DriftReviewController } from './drift-review.controller';
import { TargetProfilesService } from './target-profiles.service';
import { EffectiveSchemaResolverService } from './effective-schema-resolver.service';
import { DriftDetectionService } from './drift-detection.service';
import { ErrorNormalizationService } from './error-normalization.service';
import { MismatchDetectionService } from './mismatch-detection.service';

@Module({
  controllers: [TargetProfilesController, DriftReviewController],
  providers: [
    TargetProfilesService,
    EffectiveSchemaResolverService,
    DriftDetectionService,
    ErrorNormalizationService,
    MismatchDetectionService,
  ],
  exports: [
    TargetProfilesService,
    EffectiveSchemaResolverService,
    DriftDetectionService,
    ErrorNormalizationService,
    MismatchDetectionService,
  ],
})
export class TargetProfilesModule {}
