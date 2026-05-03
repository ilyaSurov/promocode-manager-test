import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Order } from '../orders/order.schema';
import { Promocode } from '../promocodes/promocode.schema';
import { User } from '../users/user.schema';

export type PromoUsageDocument = HydratedDocument<PromoUsage>;

@Schema({
  collection: 'promo_usages',
  timestamps: false,
})
export class PromoUsage {
  @Prop({ type: Types.ObjectId, ref: Promocode.name, required: true, index: true })
  promocodeId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Order.name, required: true, unique: true })
  orderId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  discountAmount!: number;

  @Prop({ type: Date, default: () => new Date() })
  usedAt!: Date;
}

export const PromoUsageSchema = SchemaFactory.createForClass(PromoUsage);
