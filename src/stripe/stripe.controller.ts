import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { OrdersService } from 'src/order/order.service';
import Stripe from 'stripe';

@Controller('webhook')
export class StripeWebhookController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly orderService: OrdersService,
  ) {}

  @Post()
  async handleWebhook(@Headers('stripe-signature') signature: string, @Body() body: any) {
    let event: Stripe.Event;

    try {
      // Vérification de la signature du webhook Stripe
      event = this.stripeService.verifyWebhookSignature(body.rawBody, signature);
    } catch (err) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const paymentIntentId = session.payment_intent as string;
          
          // Assurez-vous que metadata.orderId est défini dans la session Stripe
          const orderId = session.metadata?.orderId;
          if (!orderId) {
            console.warn('Order ID not found in session metadata.');
            break;
          }

          // Récupérer l'état du paiement depuis Stripe
          const stripePaymentStatus = session.payment_status;

          // Mettre à jour la commande avec les informations Stripe
          await this.orderService.updateOrderToPaid(parseInt(orderId), {
            id: paymentIntentId,
            status: stripePaymentStatus,
            email_address: session.customer_email || '',
            pricePaid: session.amount_total / 100,
          });

          console.log(`Order ${orderId} updated successfully.`);
          break;
        }
        default: {
          console.warn(`Unhandled event type: ${event.type}`);
          break;
        }
      }
    } catch (err) {
      console.error(`Unexpected error in webhook handler: ${err.message}`);
      throw new BadRequestException('Unexpected error in webhook processing.');
    }
  }
}
