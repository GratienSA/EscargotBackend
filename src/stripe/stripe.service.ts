import { Injectable, InternalServerErrorException } from '@nestjs/common';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not defined');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });
  }

  async createCheckoutSession(sessionData: Stripe.Checkout.SessionCreateParams): Promise<Stripe.Checkout.Session> {
    try {
      console.log('Creating Stripe session with data:', sessionData); // Log les données envoyées
      const session = await this.stripe.checkout.sessions.create(sessionData);
      console.log('Stripe session created successfully:', session);
      return session;
    } catch (error) {
      console.error('Stripe error:', error);
      const errorMessage =
        error instanceof Stripe.errors.StripeError
          ? `Stripe error [${error.code}]: ${error.message}`
          : 'An unexpected error occurred';
      throw new InternalServerErrorException('Failed to create Stripe session: ' + errorMessage);
    }
  }

  verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
    }
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      throw new InternalServerErrorException('Invalid Stripe webhook signature');
    }
  }

  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      console.log(`Retrieving Stripe session with ID: ${sessionId}`);
      return await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error('Error retrieving Stripe session:', error);
      const errorMessage =
        error instanceof Stripe.errors.StripeError
          ? `Stripe error [${error.code}]: ${error.message}`
          : 'An unexpected error occurred';
      throw new InternalServerErrorException('Failed to retrieve Stripe session: ' + errorMessage);
    }
  }

  async createRefund(paymentIntentId: string, amount?: number): Promise<Stripe.Refund> {
    try {
      const refundData: Stripe.RefundCreateParams = { payment_intent: paymentIntentId };
      if (amount) {
        refundData.amount = amount;
      }
      console.log(`Creating refund for PaymentIntent ${paymentIntentId} with data:`, refundData);
      return await this.stripe.refunds.create(refundData);
    } catch (error) {
      console.error('Error creating refund:', error);
      const errorMessage =
        error instanceof Stripe.errors.StripeError
          ? `Stripe error [${error.code}]: ${error.message}`
          : 'An unexpected error occurred';
      throw new InternalServerErrorException('Failed to create refund: ' + errorMessage);
    }
  }
}
