import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { ClickHouseHealthIndicator } from './clickhouse.health';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator, ClickHouseHealthIndicator],
})
export class HealthModule {}
