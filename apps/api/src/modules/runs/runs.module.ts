import { Module } from '@nestjs/common';
import { RunsController } from './runs.controller';
import { RunsFlatController } from './runs-flat.controller';
import { RunsService } from './runs.service';

@Module({
  controllers: [RunsController, RunsFlatController],
  providers: [RunsService],
  exports: [RunsService],
})
export class RunsModule {}
