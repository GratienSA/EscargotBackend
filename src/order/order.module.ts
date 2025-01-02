import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from 'src/email/email.service';
import { StripeService } from 'src/stripe/stripe.service';
import { OrdersService } from './order.service';
import { OrderController } from './order.controller';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [OrderController],
  providers: [OrdersService, EmailService, StripeService],
  exports: [OrdersService],})
export class OrdersModule {}


