import { Module } from '@nestjs/common';
import { ClickHouseModule } from '../clickhouse/clickhouse.module';
import { DatabaseModule } from '../database/database.module';
import { MongoChSyncService } from './mongo-ch-sync.service';

@Module({
  imports: [DatabaseModule, ClickHouseModule],
  providers: [MongoChSyncService],
  exports: [MongoChSyncService],
})
export class SyncModule {}
