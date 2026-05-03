import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { DatabaseModule } from '../database/database.module';
import { RedisModule } from '../redis/redis.module';
import { SyncModule } from '../sync/sync.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [DatabaseModule, SyncModule, RedisModule, AnalyticsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
