import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PromocodeDocument = HydratedDocument<Promocode>;

@Schema({
  collection: 'promocodes',
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export class Promocode {
  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 2,
    maxlength: 64,
  })
  code!: string;

  @Prop({ required: true, min: 1, max: 100 })
  discountPercent!: number;

  @Prop({ required: true, min: 0 })
  maxUsesTotal!: number;

  @Prop({ required: true, min: 0 })
  maxUsesPerUser!: number;

  @Prop({ type: Date, default: null })
  validFrom!: Date | null;

  @Prop({ type: Date, default: null })
  validTo!: Date | null;

  @Prop({ default: true })
  isActive!: boolean;

  createdAt!: Date;
  updatedAt!: Date;
}

export const PromocodeSchema = SchemaFactory.createForClass(Promocode);
