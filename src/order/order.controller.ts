import { Controller, Post, Get, Body, Param, Put, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { User } from '@prisma/client';
import { GetUser } from 'src/auth/decorator';
import { JwtGuard } from 'src/auth/guard';

@UseGuards(JwtGuard)
@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post('/create')
  createOrder(@GetUser() user: User, @Body() createOrderDto: CreateOrderDto) {
    return this.orderService.createOrder(user.id, createOrderDto);
  }

  @Get('/:id')
  getOrderById(@Param('id') id: string) {
    return this.orderService.getOrderById(+id);
  }

  @Get()
  getUserOrders(@GetUser() user: User) {
    return this.orderService.getUserOrders(user.id);
  }

  @Put('/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.orderService.updateOrderStatus(+id, status);
  }
}


