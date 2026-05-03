import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClickHouseClient, createClient } from '@clickhouse/client';

@Injectable()
export class ClickHouseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ClickHouseService.name);
  private client!: ClickHouseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const host = this.config.getOrThrow<string>('CLICKHOUSE_HOST');
    const port = this.config.getOrThrow<number>('CLICKHOUSE_PORT');
    const user = this.config.getOrThrow<string>('CLICKHOUSE_USER');
    const password = this.config.get<string>('CLICKHOUSE_PASSWORD');
    const database = this.config.getOrThrow<string>('CLICKHOUSE_DATABASE');

    this.client = createClient({
      url: `http://${host}:${port}`,
      username: user,
      password: password === '' ? undefined : password,
      database,
      request_timeout: 30_000,
      max_open_connections: 10,
    });
    this.logger.log(`ClickHouse client configured for ${host}:${port}`);
  }

  getClient(): ClickHouseClient {
    return this.client;
  }

  async ping(): Promise<void> {
    await this.client.query({
      query: 'SELECT 1',
      format: 'JSONEachRow',
    });
  }

  onModuleDestroy(): void {
    void this.client.close();
  }
}
