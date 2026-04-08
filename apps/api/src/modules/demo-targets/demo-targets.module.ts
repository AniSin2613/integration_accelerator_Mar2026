import { Module } from '@nestjs/common';
import { DemoTargetsController } from './demo-targets.controller';
import { DemoTargetsService } from './demo-targets.service';

@Module({
  controllers: [DemoTargetsController],
  providers: [DemoTargetsService],
  exports: [DemoTargetsService],
})
export class DemoTargetsModule {}
