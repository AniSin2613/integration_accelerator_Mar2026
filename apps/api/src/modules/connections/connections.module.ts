import { Module } from '@nestjs/common';
import { ConnectionsController } from './connections.controller';
import { ConnectionsFlatController } from './connections-flat.controller';
import { ConnectionsService } from './connections.service';

@Module({
  controllers: [ConnectionsController, ConnectionsFlatController],
  providers: [ConnectionsService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
