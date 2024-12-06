
import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { StripeService } from './stripe.service';

@Controller('webhook')
export class StripeWebhookController {
  constructor(private readonly stripeService: StripeService) {}

  @Post()
  async handleWebhook(@Headers('stripe-signature') signature: string, @Body() body: any) {
    let event;

    try {
      event = this.stripeService.verifyWebhookSignature(body.rawBody, signature);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Payment succeeded:', event.data.object);
        // Mettez à jour l'état de la commande ici
        break;
      default:
        console.warn(`Unhandled event type ${event.type}`);
    }

    return { received: true };
  }
}