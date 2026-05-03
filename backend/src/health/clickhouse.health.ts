import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { ClickHouseService } from '../clickhouse/clickhouse.service';

@Injectable()
export class ClickHouseHealthIndicator extends HealthIndicator {
  constructor(private readonly clickHouse: ClickHouseService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.clickHouse.ping();
      return this.getStatus(key, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HealthCheckError(
        'ClickHouse ping failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
