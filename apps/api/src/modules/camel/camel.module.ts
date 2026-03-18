import { Module } from '@nestjs/common';
import { CamelService } from './camel.service';

@Module({
  providers: [CamelService],
  exports: [CamelService],
})
export class CamelModule {}
