import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { StripeService } from 'src/stripe/stripe.service';

@Module({
  controllers: [CheckoutController],
  providers: [StripeService],
})
export class CheckoutModule {}
