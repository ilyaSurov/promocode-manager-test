import { Global, Module } from '@nestjs/common';
import { ClickHouseService } from './clickhouse.service';
import { ClickHouseTablesService } from './clickhouse-tables.service';

@Global()
@Module({
  providers: [ClickHouseService, ClickHouseTablesService],
  exports: [ClickHouseService, ClickHouseTablesService],
})
export class ClickHouseModule {}
