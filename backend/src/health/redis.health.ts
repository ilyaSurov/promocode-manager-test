import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly redis: RedisService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.getClient().ping();
      if (pong !== 'PONG') {
        throw new HealthCheckError(
          'Redis ping unexpected reply',
          this.getStatus(key, false, { reply: pong }),
        );
      }
      return this.getStatus(key, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new HealthCheckError(
        'Redis ping failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
