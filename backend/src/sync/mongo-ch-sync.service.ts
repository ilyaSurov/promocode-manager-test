import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { mongoIdToString } from '../common/utils/mongo-id';
import { ClickHouseService } from '../clickhouse/clickhouse.service';
import { Order, OrderDocument } from '../orders/order.schema';
import { Promocode, PromocodeDocument } from '../promocodes/promocode.schema';
import { PromoUsage, PromoUsageDocument } from '../promo-usages/promo-usage.schema';
import { User, UserDocument } from '../users/user.schema';

function toChDateTime64(d: Date): string {
  const x = d.toISOString();
  return `${x.slice(0, 10)} ${x.slice(11, 23)}`;
}

@Injectable()
export class MongoChSyncService {
  private readonly logger = new Logger(MongoChSyncService.name);

  constructor(
    private readonly clickHouse: ClickHouseService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Promocode.name)
    private readonly promocodeModel: Model<PromocodeDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(PromoUsage.name)
    private readonly promoUsageModel: Model<PromoUsageDocument>,
  ) {}

  async syncUser(user: UserDocument): Promise<void> {
    const id = mongoIdToString(user._id);
    const row = {
      id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      is_active: user.isActive ? 1 : 0,
      created_at: toChDateTime64(user.createdAt),
      updated_at: toChDateTime64(user.updatedAt),
    };
    await this.insertWithRetry('syncUser', () =>
      this.clickHouse.getClient().insert({
        table: 'users',
        values: [row],
        format: 'JSONEachRow',
      }),
    );
  }

  async syncUserById(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId).exec();
    if (user) {
      await this.syncUser(user);
    }
  }

  async syncPromocode(promocode: PromocodeDocument): Promise<void> {
    const id = mongoIdToString(promocode._id);
    const row = {
      id,
      code: promocode.code,
      discount_percent: promocode.discountPercent,
      max_uses_total: promocode.maxUsesTotal,
      max_uses_per_user: promocode.maxUsesPerUser,
      valid_from:
        promocode.validFrom != null
          ? toChDateTime64(promocode.validFrom)
          : null,
      valid_to:
        promocode.validTo != null ? toChDateTime64(promocode.validTo) : null,
      is_active: promocode.isActive ? 1 : 0,
      created_at: toChDateTime64(promocode.createdAt),
      updated_at: toChDateTime64(promocode.updatedAt),
    };
    await this.insertWithRetry('syncPromocode', () =>
      this.clickHouse.getClient().insert({
        table: 'promocodes',
        values: [row],
        format: 'JSONEachRow',
      }),
    );
  }

  async syncPromocodeById(promocodeId: string): Promise<void> {
    const doc = await this.promocodeModel.findById(promocodeId).exec();
    if (doc) {
      await this.syncPromocode(doc);
    }
  }

  async syncOrder(order: OrderDocument): Promise<void> {
    const user = await this.userModel.findById(order.userId).lean().exec();
    if (!user) {
      this.logger.warn(
        `syncOrder skipped: user ${mongoIdToString(order.userId)} not found`,
      );
      return;
    }
    let promocodeCode: string | null = null;
    if (order.promocodeId) {
      const pc = await this.promocodeModel
        .findById(order.promocodeId)
        .lean()
        .exec();
      promocodeCode = pc?.code ?? null;
    }
    const id = mongoIdToString(order._id);
    const row = {
      id,
      user_id: mongoIdToString(order.userId),
      user_email: user.email,
      user_name: user.name,
      amount: order.amount,
      promocode_id: order.promocodeId
        ? mongoIdToString(order.promocodeId)
        : null,
      promocode_code: promocodeCode,
      discount_amount: order.discountAmount,
      created_at: toChDateTime64(order.createdAt),
      updated_at: toChDateTime64(order.updatedAt),
    };
    await this.insertWithRetry('syncOrder', () =>
      this.clickHouse.getClient().insert({
        table: 'orders',
        values: [row],
        format: 'JSONEachRow',
      }),
    );
  }

  async syncOrderById(orderId: string): Promise<void> {
    const doc = await this.orderModel.findById(orderId).exec();
    if (doc) {
      await this.syncOrder(doc);
    }
  }

  async syncPromoUsage(usage: PromoUsageDocument): Promise<void> {
    const [user, promocode] = await Promise.all([
      this.userModel.findById(usage.userId).lean().exec(),
      this.promocodeModel.findById(usage.promocodeId).lean().exec(),
    ]);
    if (!user || !promocode) {
      this.logger.warn(
        `syncPromoUsage skipped: user or promocode missing for usage ${mongoIdToString(usage._id)}`,
      );
      return;
    }
    const id = mongoIdToString(usage._id);
    const usedAt = usage.usedAt;
    const row = {
      id,
      promocode_id: mongoIdToString(usage.promocodeId),
      promocode_code: promocode.code,
      user_id: mongoIdToString(usage.userId),
      user_email: user.email,
      user_name: user.name,
      order_id: mongoIdToString(usage.orderId),
      discount_amount: usage.discountAmount,
      used_at: toChDateTime64(usedAt),
      updated_at: toChDateTime64(usedAt),
    };
    await this.insertWithRetry('syncPromoUsage', () =>
      this.clickHouse.getClient().insert({
        table: 'promo_usages',
        values: [row],
        format: 'JSONEachRow',
      }),
    );
  }

  async syncPromoUsageById(usageId: string): Promise<void> {
    const doc = await this.promoUsageModel.findById(usageId).exec();
    if (doc) {
      await this.syncPromoUsage(doc);
    }
  }

  private async insertWithRetry(
    label: string,
    fn: () => Promise<unknown>,
  ): Promise<void> {
    const max = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= max; attempt++) {
      try {
        await fn();
        return;
      } catch (error) {
        lastError = error;
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`${label} attempt ${attempt}/${max}: ${msg}`);
        if (attempt < max) {
          await new Promise((r) => setTimeout(r, 120 * attempt));
        }
      }
    }
    this.logger.error(`${label} failed after ${max} attempts`, lastError);
  }
}
