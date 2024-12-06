import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { StripeService } from '../stripe/stripe.service';
import { OrderService } from '../order/order.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  providers: [CheckoutService, StripeService, OrderService, PrismaService],
  controllers: [CheckoutController],
  exports: [CheckoutService],
})
export class CheckoutModule {}