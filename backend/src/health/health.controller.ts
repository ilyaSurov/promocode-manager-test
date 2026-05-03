import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MongooseHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../common/decorators/public.decorator';
import { ClickHouseHealthIndicator } from './clickhouse.health';
import { RedisHealthIndicator } from './redis.health';

@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly mongoose: MongooseHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
    private readonly clickHouseIndicator: ClickHouseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.mongoose.pingCheck('mongodb'),
      () => this.redisIndicator.isHealthy('redis'),
      () => this.clickHouseIndicator.isHealthy('clickhouse'),
    ]);
  }
}
