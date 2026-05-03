import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import { RedisService } from '../redis/redis.service';
import { AnalyticsTableQueryDto } from './dto/analytics-table.query.dto';

const ANALYTICS_CACHE_TTL_SEC = 45;

function isoToChDateTime(iso: string): string {
  const d = new Date(iso);
  const x = d.toISOString();
  return `${x.slice(0, 10)} ${x.slice(11, 23)}`;
}

type UsersRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  is_active: number;
  created_at: string;
  order_count: number;
  total_spent: string;
  total_discount: string;
  promo_usage_count: number;
};

type PromocodesRow = {
  id: string;
  code: string;
  discount_percent: number;
  max_uses_total: number;
  max_uses_per_user: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: number;
  created_at: string;
  usage_count: number;
  unique_users: number;
  revenue_discount: string;
};

type UsagesRow = {
  id: string;
  promocode_id: string;
  promocode_code: string;
  user_id: string;
  user_email: string;
  user_name: string;
  order_id: string;
  discount_amount: string;
  used_at: string;
};

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  private static readonly USER_SORT: Record<string, string> = {
    email: 'email',
    name: 'name',
    order_count: 'order_count',
    total_spent: 'total_spent',
    total_discount: 'total_discount',
    promo_usage_count: 'promo_usage_count',
    created_at: 'created_at',
  };

  private static readonly PROMO_SORT: Record<string, string> = {
    code: 'code',
    discount_percent: 'discount_percent',
    usage_count: 'usage_count',
    unique_users: 'unique_users',
    revenue_discount: 'revenue_discount',
    created_at: 'created_at',
  };

  private static readonly USAGE_SORT: Record<string, string> = {
    used_at: 'used_at',
    discount_amount: 'discount_amount',
    user_email: 'user_email',
    promocode_code: 'promocode_code',
    user_name: 'user_name',
  };

  constructor(
    private readonly clickHouse: ClickHouseService,
    private readonly redis: RedisService,
  ) {}

  async clearCache(): Promise<void> {
    const client = this.redis.getClient();
    let cursor = '0';
    try {
      do {
        const [next, keys] = await client.scan(
          cursor,
          'MATCH',
          'analytics:*',
          'COUNT',
          '200',
        );
        cursor = next;
        if (keys.length > 0) {
          await client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn('analytics cache clear failed', error);
    }
  }

  async usersTable(q: AnalyticsTableQueryDto) {
    const cacheKey = this.makeCacheKey('users', q);
    const cached = await this.redis.getClient().get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as {
        items: unknown[];
        total: number;
        page: number;
        pageSize: number;
      };
    }
    const dateFrom = isoToChDateTime(q.dateFrom);
    const dateTo = isoToChDateTime(q.dateTo);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 10;
    const offset = (page - 1) * pageSize;
    const sortCol =
      AnalyticsService.USER_SORT[q.sortBy ?? 'email'] ??
      AnalyticsService.USER_SORT.email;
    const dir = q.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const filterEmail = (q.filterEmail ?? '').trim();
    const filterActive =
      q.filterActive === 0 || q.filterActive === 1 ? q.filterActive : null;

    const baseParams = {
      dateFrom,
      dateTo,
      filterEmail,
      filterActiveNull: filterActive === null ? 1 : 0,
      filterActiveVal: filterActive ?? 0,
    };

    const countQuery = `
      SELECT count() AS c
      FROM (
        SELECT u.id AS id
        FROM users AS u FINAL
        WHERE (length({filterEmail:String}) = 0 OR u.email ILIKE concat('%', {filterEmail:String}, '%'))
          AND (
            {filterActiveNull:UInt8} = 1 OR u.is_active = {filterActiveVal:UInt8}
          )
      ) AS _
    `;

    const countRes = await this.clickHouse.getClient().query({
      query: countQuery,
      query_params: baseParams,
      format: 'JSONEachRow',
    });
    const countRows = (await countRes.json()) as { c: string }[];
    const total = Number(countRows[0]?.c ?? 0);

    const dataQuery = `
      SELECT
        u.id AS id,
        u.email AS email,
        u.name AS name,
        u.phone AS phone,
        u.is_active AS is_active,
        u.created_at AS created_at,
        ifNull(o.cnt, 0) AS order_count,
        ifNull(o.amt, 0) AS total_spent,
        ifNull(o.disc, 0) AS total_discount,
        ifNull(p.ucnt, 0) AS promo_usage_count
      FROM users AS u FINAL
      LEFT JOIN (
        SELECT
          user_id,
          count() AS cnt,
          sum(amount) AS amt,
          sum(discount_amount) AS disc
        FROM orders FINAL
        WHERE created_at >= parseDateTime64BestEffort({dateFrom:String})
          AND created_at < parseDateTime64BestEffort({dateTo:String})
        GROUP BY user_id
      ) AS o ON o.user_id = u.id
      LEFT JOIN (
        SELECT user_id, count() AS ucnt
        FROM promo_usages FINAL
        WHERE used_at >= parseDateTime64BestEffort({dateFrom:String})
          AND used_at < parseDateTime64BestEffort({dateTo:String})
        GROUP BY user_id
      ) AS p ON p.user_id = u.id
      WHERE (length({filterEmail:String}) = 0 OR u.email ILIKE concat('%', {filterEmail:String}, '%'))
        AND (
          {filterActiveNull:UInt8} = 1 OR u.is_active = {filterActiveVal:UInt8}
        )
      ORDER BY ${sortCol} ${dir}
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    const dataRes = await this.clickHouse.getClient().query({
      query: dataQuery,
      query_params: { ...baseParams, limit: pageSize, offset },
      format: 'JSONEachRow',
    });
    const rows = (await dataRes.json()) as UsersRow[];
    const items = rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      phone: r.phone,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      orderCount: r.order_count,
      totalSpent: Number(r.total_spent),
      totalDiscount: Number(r.total_discount),
      promoUsageCount: r.promo_usage_count,
    }));

    const payload = { items, total, page, pageSize };
    await this.redis
      .getClient()
      .setex(cacheKey, ANALYTICS_CACHE_TTL_SEC, JSON.stringify(payload));
    return payload;
  }

  async promocodesTable(q: AnalyticsTableQueryDto) {
    const cacheKey = this.makeCacheKey('promocodes', q);
    const cached = await this.redis.getClient().get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as {
        items: unknown[];
        total: number;
        page: number;
        pageSize: number;
      };
    }
    const dateFrom = isoToChDateTime(q.dateFrom);
    const dateTo = isoToChDateTime(q.dateTo);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 10;
    const offset = (page - 1) * pageSize;
    const sortCol =
      AnalyticsService.PROMO_SORT[q.sortBy ?? 'code'] ??
      AnalyticsService.PROMO_SORT.code;
    const dir = q.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const filterCode = (q.filterCode ?? '').trim();
    const filterActive =
      q.filterActive === 0 || q.filterActive === 1 ? q.filterActive : null;

    const baseParams = {
      dateFrom,
      dateTo,
      filterCode,
      filterActiveNull: filterActive === null ? 1 : 0,
      filterActiveVal: filterActive ?? 0,
    };

    const countQuery = `
      SELECT count() AS c
      FROM (
        SELECT p.id AS id
        FROM promocodes AS p FINAL
        WHERE (length({filterCode:String}) = 0 OR p.code ILIKE concat('%', {filterCode:String}, '%'))
          AND (
            {filterActiveNull:UInt8} = 1 OR p.is_active = {filterActiveVal:UInt8}
          )
      ) AS _
    `;

    const countRes = await this.clickHouse.getClient().query({
      query: countQuery,
      query_params: baseParams,
      format: 'JSONEachRow',
    });
    const countRows = (await countRes.json()) as { c: string }[];
    const total = Number(countRows[0]?.c ?? 0);

    const dataQuery = `
      SELECT
        p.id AS id,
        p.code AS code,
        p.discount_percent AS discount_percent,
        p.max_uses_total AS max_uses_total,
        p.max_uses_per_user AS max_uses_per_user,
        p.valid_from AS valid_from,
        p.valid_to AS valid_to,
        p.is_active AS is_active,
        p.created_at AS created_at,
        ifNull(u.usage_count, 0) AS usage_count,
        ifNull(u.unique_users, 0) AS unique_users,
        ifNull(rv.revenue_discount, 0) AS revenue_discount
      FROM promocodes AS p FINAL
      LEFT JOIN (
        SELECT
          promocode_id,
          count() AS usage_count,
          uniq(user_id) AS unique_users
        FROM promo_usages FINAL
        WHERE used_at >= parseDateTime64BestEffort({dateFrom:String})
          AND used_at < parseDateTime64BestEffort({dateTo:String})
        GROUP BY promocode_id
      ) AS u ON u.promocode_id = p.id
      LEFT JOIN (
        SELECT promocode_id, sum(discount_amount) AS revenue_discount
        FROM orders FINAL
        WHERE promocode_id IS NOT NULL
          AND created_at >= parseDateTime64BestEffort({dateFrom:String})
          AND created_at < parseDateTime64BestEffort({dateTo:String})
        GROUP BY promocode_id
      ) AS rv ON rv.promocode_id = p.id
      WHERE (length({filterCode:String}) = 0 OR p.code ILIKE concat('%', {filterCode:String}, '%'))
        AND (
          {filterActiveNull:UInt8} = 1 OR p.is_active = {filterActiveVal:UInt8}
        )
      ORDER BY ${sortCol} ${dir}
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    const dataRes = await this.clickHouse.getClient().query({
      query: dataQuery,
      query_params: { ...baseParams, limit: pageSize, offset },
      format: 'JSONEachRow',
    });
    const rows = (await dataRes.json()) as PromocodesRow[];
    const items = rows.map((r) => ({
      id: r.id,
      code: r.code,
      discountPercent: r.discount_percent,
      maxUsesTotal: r.max_uses_total,
      maxUsesPerUser: r.max_uses_per_user,
      validFrom: r.valid_from,
      validTo: r.valid_to,
      isActive: Boolean(r.is_active),
      createdAt: r.created_at,
      usageCount: r.usage_count,
      uniqueUsers: r.unique_users,
      revenueDiscount: Number(r.revenue_discount),
    }));

    const payload = { items, total, page, pageSize };
    await this.redis
      .getClient()
      .setex(cacheKey, ANALYTICS_CACHE_TTL_SEC, JSON.stringify(payload));
    return payload;
  }

  async promoUsagesTable(q: AnalyticsTableQueryDto) {
    const cacheKey = this.makeCacheKey('promo_usages', q);
    const cached = await this.redis.getClient().get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as {
        items: unknown[];
        total: number;
        page: number;
        pageSize: number;
      };
    }
    const dateFrom = isoToChDateTime(q.dateFrom);
    const dateTo = isoToChDateTime(q.dateTo);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 10;
    const offset = (page - 1) * pageSize;
    const sortCol =
      AnalyticsService.USAGE_SORT[q.sortBy ?? 'used_at'] ??
      AnalyticsService.USAGE_SORT.used_at;
    const dir = q.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const filterEmail = (q.filterEmail ?? '').trim();
    const filterCode = (q.filterCode ?? '').trim();

    const baseParams = {
      dateFrom,
      dateTo,
      filterEmail,
      filterCode,
    };

    const countQuery = `
      SELECT count() AS c
      FROM (
        SELECT pu.id AS id
        FROM promo_usages AS pu FINAL
        WHERE used_at >= parseDateTime64BestEffort({dateFrom:String})
          AND used_at < parseDateTime64BestEffort({dateTo:String})
          AND (length({filterEmail:String}) = 0 OR pu.user_email ILIKE concat('%', {filterEmail:String}, '%'))
          AND (length({filterCode:String}) = 0 OR pu.promocode_code ILIKE concat('%', {filterCode:String}, '%'))
      ) AS _
    `;

    const countRes = await this.clickHouse.getClient().query({
      query: countQuery,
      query_params: baseParams,
      format: 'JSONEachRow',
    });
    const countRows = (await countRes.json()) as { c: string }[];
    const total = Number(countRows[0]?.c ?? 0);

    const dataQuery = `
      SELECT
        pu.id AS id,
        pu.promocode_id AS promocode_id,
        pu.promocode_code AS promocode_code,
        pu.user_id AS user_id,
        pu.user_email AS user_email,
        pu.user_name AS user_name,
        pu.order_id AS order_id,
        toString(pu.discount_amount) AS discount_amount,
        pu.used_at AS used_at
      FROM promo_usages AS pu FINAL
      WHERE used_at >= parseDateTime64BestEffort({dateFrom:String})
        AND used_at < parseDateTime64BestEffort({dateTo:String})
        AND (length({filterEmail:String}) = 0 OR pu.user_email ILIKE concat('%', {filterEmail:String}, '%'))
        AND (length({filterCode:String}) = 0 OR pu.promocode_code ILIKE concat('%', {filterCode:String}, '%'))
      ORDER BY ${sortCol} ${dir}
      LIMIT {limit:UInt32} OFFSET {offset:UInt32}
    `;

    const dataRes = await this.clickHouse.getClient().query({
      query: dataQuery,
      query_params: { ...baseParams, limit: pageSize, offset },
      format: 'JSONEachRow',
    });
    const rows = (await dataRes.json()) as UsagesRow[];
    const items = rows.map((r) => ({
      id: r.id,
      promocodeId: r.promocode_id,
      promocodeCode: r.promocode_code,
      userId: r.user_id,
      userEmail: r.user_email,
      userName: r.user_name,
      orderId: r.order_id,
      discountAmount: Number(r.discount_amount),
      usedAt: r.used_at,
    }));

    const payload = { items, total, page, pageSize };
    await this.redis
      .getClient()
      .setex(cacheKey, ANALYTICS_CACHE_TTL_SEC, JSON.stringify(payload));
    return payload;
  }

  private makeCacheKey(kind: string, q: AnalyticsTableQueryDto): string {
    const h = createHash('sha256')
      .update(JSON.stringify({ kind, ...q }))
      .digest('hex');
    return `analytics:${kind}:${h}`;
  }
}
