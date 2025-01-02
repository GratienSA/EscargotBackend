import { Controller, Post, Body, Get, Param, Query, UseGuards, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { OrdersService } from './order.service';
import { CreateOrderDto, OrderDto, OrderItemDto } from './dto/create-order.dto'; 
import { User } from '@prisma/client'; 
import { GetUser } from 'src/auth/decorator'
import { AuthGuard } from '@nestjs/passport/dist/auth.guard';
import { StripeService } from 'src/stripe/stripe.service';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';

 
@UseGuards(AuthGuard('jwt'))
@Controller('order')
export class OrderController {
  constructor(
    private readonly orderService: OrdersService,
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService
  ) {}

  @Post()
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    if (!createOrderDto.orderItems || createOrderDto.orderItems.length === 0) {
      throw new BadRequestException('Order items are required.');
    }

    const { userId, orderItems } = createOrderDto;

    if (!userId || !orderItems[0]?.productId) {
      throw new BadRequestException('Invalid data: userId or productId missing.');
    }

    const sessionData: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      line_items: orderItems.map((item: OrderItemDto) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Produit ${item.productId}`,
          },
          unit_amount: parseInt((item.price * 100).toFixed(0)),
        },
        quantity: item.quantity,
      })),
      mode: 'payment' as 'payment',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    };

    try {
      // Créer la session Stripe
      const session = await this.stripeService.createCheckoutSession(sessionData);

      // Créer la commande dans la base de données
      const order = await this.prisma.order.create({
        data: {
          userId,
          shippingStreet: createOrderDto.shippingStreet,
          shippingCity: createOrderDto.shippingCity,
          shippingZip: createOrderDto.shippingZip,
          paymentMethod: createOrderDto.paymentMethod,
          itemsPrice: parseFloat(createOrderDto.itemsPrice.toString()),
          taxPrice: parseFloat(createOrderDto.taxPrice.toString()),
          shippingPrice: parseFloat(createOrderDto.shippingPrice?.toString() || '0'),
          totalAmount: parseFloat(createOrderDto.totalAmount.toString()),
          status: 'PENDING',
          isPaid: false,
          orderItems: {
            create: orderItems.map(item => ({
              quantity: item.quantity,
              price: parseFloat(item.price.toString()),
              product: { connect: { id: item.productId } },
            })),
          },
        },
        include: {
          orderItems: true,
        },
      });

      // Retourner l'ID de la session Stripe et l'ID de la commande
      return { 
        sessionId: session.id,
        orderId: order.id
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw new InternalServerErrorException('Failed to create order: ' + error.message);
    }
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

  @Get('all')
  async getAllOrders(
   
  ): Promise<{ data: OrderDto[]; totalPages: number }> {
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