import { Controller, Post, Get, Body, Param, Query } from '@nestjs/common';
import { OrdersService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetUser } from 'src/auth/decorator'; 
import { User } from '@prisma/client';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrdersService) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto, @GetUser() user: User) {
    return this.orderService.createOrder(user.id, createOrderDto); // Passez l'ID de l'utilisateur et le DTO
  }

  @Post(':id/deliver')
  async deliver(@Param('id') orderId: number) {
    return this.orderService.deliverOrder(orderId);
  }

  @Post(':id/cod')
  async updateOrderToPaidByCOD(@Param('id') orderId: number) {
    return this.orderService.updateOrderToPaidByCOD(orderId);
  }

  @Post(':id/approve')
  async approveStripeOrder(@Param('id') orderId: number, @Body() body: { sessionId: string }) {
    return this.orderService.approveStripeOrder(orderId, body);
  }

  @Post(':id/stripe')
  async createStripeOrder(@Param('id') orderId: number) {
    return this.orderService.createStripeOrder(orderId);
  }

  @Post(':id/delete')
  async deleteOrder(@Param('id') orderId: number) {
    return this.orderService.deleteOrder(orderId);
  }

  @Get()
  async getAllOrders() {
    return this.orderService.getAllOrders();
  }

  @Get('summary')
  async getOrderSummary() {
    return this.orderService.getOrderSummary();
  }

  @Get('my-orders')
  async getMyOrders(
    @GetUser() user: User,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 12,
  ) {
    return this.orderService.getMyOrders(user.id, page, limit);
  }
  

  @Get(':id')
  async getOrderById(@Param('id') orderId: number) {
    return this.orderService.getOrderById(orderId);
  }
}