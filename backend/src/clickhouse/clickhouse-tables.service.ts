import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClickHouseService } from './clickhouse.service';

@Injectable()
export class ClickHouseTablesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ClickHouseTablesService.name);

  constructor(
    private readonly clickHouse: ClickHouseService,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureTables();
  }

  private async ensureTables(): Promise<void> {
    const db = this.config.getOrThrow<string>('CLICKHOUSE_DATABASE');
    const client = this.clickHouse.getClient();
    await client.command({
      query: `CREATE DATABASE IF NOT EXISTS \`${db}\``,
    });

    const tables: string[] = [
      `CREATE TABLE IF NOT EXISTS \`${db}\`.\`users\` (
        \`id\` String,
        \`email\` String,
        \`name\` String,
        \`phone\` String,
        \`is_active\` UInt8,
        \`created_at\` DateTime64(3, 'UTC'),
        \`updated_at\` DateTime64(3, 'UTC')
      )
      ENGINE = ReplacingMergeTree(\`updated_at\`)
      ORDER BY (\`id\`)`,

      `CREATE TABLE IF NOT EXISTS \`${db}\`.\`promocodes\` (
        \`id\` String,
        \`code\` String,
        \`discount_percent\` UInt8,
        \`max_uses_total\` UInt32,
        \`max_uses_per_user\` UInt32,
        \`valid_from\` Nullable(DateTime64(3, 'UTC')),
        \`valid_to\` Nullable(DateTime64(3, 'UTC')),
        \`is_active\` UInt8,
        \`created_at\` DateTime64(3, 'UTC'),
        \`updated_at\` DateTime64(3, 'UTC')
      )
      ENGINE = ReplacingMergeTree(\`updated_at\`)
      ORDER BY (\`id\`)`,

      `CREATE TABLE IF NOT EXISTS \`${db}\`.\`orders\` (
        \`id\` String,
        \`user_id\` String,
        \`user_email\` String,
        \`user_name\` String,
        \`amount\` Decimal(18, 2),
        \`promocode_id\` Nullable(String),
        \`promocode_code\` Nullable(String),
        \`discount_amount\` Decimal(18, 2),
        \`created_at\` DateTime64(3, 'UTC'),
        \`updated_at\` DateTime64(3, 'UTC')
      )
      ENGINE = ReplacingMergeTree(\`updated_at\`)
      ORDER BY (\`id\`)`,

      `CREATE TABLE IF NOT EXISTS \`${db}\`.\`promo_usages\` (
        \`id\` String,
        \`promocode_id\` String,
        \`promocode_code\` String,
        \`user_id\` String,
        \`user_email\` String,
        \`user_name\` String,
        \`order_id\` String,
        \`discount_amount\` Decimal(18, 2),
        \`used_at\` DateTime64(3, 'UTC'),
        \`updated_at\` DateTime64(3, 'UTC')
      )
      ENGINE = ReplacingMergeTree(\`updated_at\`)
      ORDER BY (\`id\`)`,
    ];

    for (const ddl of tables) {
      await client.command({ query: ddl });
    }
    this.logger.log(`ClickHouse tables ensured in database "${db}"`);
  }
}
