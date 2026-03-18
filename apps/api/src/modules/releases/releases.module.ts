import { Module } from '@nestjs/common';
import { ReleasesController } from './releases.controller';
import { ReleasesFlatController } from './releases-flat.controller';
import { ReleasesService } from './releases.service';
import { CamelModule } from '../camel/camel.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [CamelModule, AuditModule],
  controllers: [ReleasesController, ReleasesFlatController],
  providers: [ReleasesService],
  exports: [ReleasesService],
})
export class ReleasesModule {}
