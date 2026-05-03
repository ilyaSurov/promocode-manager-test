import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from '../orders/order.schema';
import { Promocode, PromocodeSchema } from '../promocodes/promocode.schema';
import { PromoUsage, PromoUsageSchema } from '../promo-usages/promo-usage.schema';
import { User, UserSchema } from '../users/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Promocode.name, schema: PromocodeSchema },
      { name: Order.name, schema: OrderSchema },
      { name: PromoUsage.name, schema: PromoUsageSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
