import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AnalyticsService } from '../analytics/analytics.service';
import { RedisService } from '../redis/redis.service';
import { MongoChSyncService } from '../sync/mongo-ch-sync.service';
import { ApplyPromocodeDto } from './dto/apply-promocode.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderDocument } from './order.schema';
import { Promocode, PromocodeDocument } from '../promocodes/promocode.schema';
import { PromoUsage, PromoUsageDocument } from '../promo-usages/promo-usage.schema';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Promocode.name)
    private readonly promocodeModel: Model<PromocodeDocument>,
    @InjectModel(PromoUsage.name)
    private readonly promoUsageModel: Model<PromoUsageDocument>,
    private readonly redis: RedisService,
    private readonly sync: MongoChSyncService,
    private readonly analytics: AnalyticsService,
  ) {}

  async create(userId: string, dto: CreateOrderDto): Promise<OrderDocument> {
    const order = await this.orderModel.create({
      userId: new Types.ObjectId(userId),
      amount: dto.amount,
      promocodeId: null,
      discountAmount: 0,
      promocodeAppliedAt: null,
    });
    void this.sync.syncOrder(order);
    void this.analytics.clearCache();
    return order;
  }

  async findMine(userId: string): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async applyPromocode(
    userId: string,
    orderId: string,
    dto: ApplyPromocodeDto,
  ): Promise<OrderDocument> {
    await this.assertApplyRateLimit(userId);
    const code = dto.code.trim().toUpperCase();
    const promocode = await this.promocodeModel.findOne({ code }).exec();
    if (!promocode || !promocode.isActive) {
      throw new BadRequestException('Invalid or inactive promocode');
    }
    const lockKey = `lock:apply-promo:${promocode._id.toString()}`;
    const r = this.redis.getClient();
    const locked = await r.set(lockKey, '1', 'EX', 30, 'NX');
    if (!locked) {
      throw new ConflictException('Could not acquire lock, try again');
    }
    try {
      const order = await this.orderModel.findById(orderId).exec();
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      if (order.userId.toString() !== userId) {
        throw new ForbiddenException('Order does not belong to you');
      }
      if (order.promocodeId) {
        throw new BadRequestException('Order already has a promocode');
      }
      const now = new Date();
      if (promocode.validFrom && now < promocode.validFrom) {
        throw new BadRequestException('Promocode is not active yet');
      }
      if (promocode.validTo && now > promocode.validTo) {
        throw new BadRequestException('Promocode has expired');
      }
      if (promocode.maxUsesTotal === 0 || promocode.maxUsesPerUser === 0) {
        throw new BadRequestException('Promocode cannot be applied');
      }
      const totalUses = await this.promoUsageModel
        .countDocuments({ promocodeId: promocode._id })
        .exec();
      if (totalUses >= promocode.maxUsesTotal) {
        throw new BadRequestException('Promocode global usage limit reached');
      }
      const userOid = new Types.ObjectId(userId);
      const userUses = await this.promoUsageModel
        .countDocuments({ promocodeId: promocode._id, userId: userOid })
        .exec();
      if (userUses >= promocode.maxUsesPerUser) {
        throw new BadRequestException('Promocode usage limit for you reached');
      }
      const discountAmount =
        Math.round(order.amount * (promocode.discountPercent / 100) * 100) /
        100;
      order.promocodeId = promocode._id;
      order.discountAmount = discountAmount;
      order.promocodeAppliedAt = now;
      await order.save();
      const usage = await this.promoUsageModel.create({
        promocodeId: promocode._id,
        userId: order.userId,
        orderId: order._id,
        discountAmount,
        usedAt: now,
      });
      void this.sync.syncOrder(order);
      void this.sync.syncPromoUsage(usage);
      void this.analytics.clearCache();
      return order;
    } finally {
      const released = await r.del(lockKey);
      if (released === 0) {
        this.logger.warn(`Lock release miss for ${lockKey}`);
      }
    }
  }

  private async assertApplyRateLimit(userId: string): Promise<void> {
    const key = `rl:apply-promo:user:${userId}`;
    const n = await this.redis.getClient().incr(key);
    if (n === 1) {
      await this.redis.getClient().expire(key, 60);
    }
    if (n > 45) {
      throw new HttpException(
        'Too many apply attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
