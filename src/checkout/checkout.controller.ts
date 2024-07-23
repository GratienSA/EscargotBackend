import { Controller, Post, Body, InternalServerErrorException } from '@nestjs/common';
import { StripeService } from 'src/stripe/stripe.service';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly stripeService: StripeService) {}

  @Post()
  async createCheckoutSession(@Body() checkoutData: any) {
    console.log("Received checkout request:", JSON.stringify(checkoutData, null, 2));
    try {
      const { items, userId, success_url, cancel_url } = checkoutData;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new Error('Invalid or empty items array');
      }

      const lineItems = items.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.name,
            images: [item.image],
          },
          unit_amount: Math.round(item.price * 100), // Stripe utilise les centimes
        },
        quantity: item.quantity,
      }));

      console.log("Formatted line items:", JSON.stringify(lineItems, null, 2));

      const session = await this.stripeService.createCheckoutSession({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: success_url || 'http://localhost:3000/success',
        cancel_url: cancel_url || 'http://localhost:3000/cart',
        metadata: {
          userId: userId || 'anonymous',
        },
      });

      console.log("Stripe session created:", session.id);
      return { sessionId: session.id };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new InternalServerErrorException('Failed to create checkout session: ' + error.message);
    }
  }
}