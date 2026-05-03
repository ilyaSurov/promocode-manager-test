import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { ApplyPromocodeDto } from './dto/apply-promocode.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.userId, dto);
  }

  @Get('mine')
  listMine(@CurrentUser() user: RequestUser) {
    return this.orders.findMine(user.userId);
  }

  @Post(':id/apply-promocode')
  apply(
    @CurrentUser() user: RequestUser,
    @Param('id') orderId: string,
    @Body() dto: ApplyPromocodeDto,
  ) {
    return this.orders.applyPromocode(user.userId, orderId, dto);
  }
}
