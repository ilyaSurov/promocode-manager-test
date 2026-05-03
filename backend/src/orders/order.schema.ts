import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Promocode } from '../promocodes/promocode.schema';
import { User } from '../users/user.schema';

export type OrderDocument = HydratedDocument<Order>;

@Schema({
  collection: 'orders',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class Order {
  @Prop({ type: Types.ObjectId, ref: User.name, required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount!: number;

  @Prop({ type: Types.ObjectId, ref: Promocode.name, default: null })
  promocodeId!: Types.ObjectId | null;

  @Prop({ default: 0, min: 0 })
  discountAmount!: number;

  @Prop({ type: Date, default: null })
  promocodeAppliedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ userId: 1, createdAt: -1 });
