import { Module } from '@nestjs/common';
import { SchemaPacksController } from './schema-packs.controller';

@Module({
  controllers: [SchemaPacksController],
})
export class SchemaPacksModule {}
