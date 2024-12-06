import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutData } from './interfaces/checkout-data.interface';
import Stripe from 'stripe';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService
  ) {}

  async createCheckoutSession(checkoutData: CheckoutData) {
    console.log("CheckoutService received data:", JSON.stringify(checkoutData, null, 2));

    const { items, userId, success_url, cancel_url } = checkoutData;

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(item => {
      // Vérification si l'ID du produit est défini
      if (!item.productId) {
        throw new BadRequestException(`Invalid productId: ${item.productId}`);
      }

      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.name,
            images: [item.image],
          },
          unit_amount: Math.round(item.price * 100), 
        },
        quantity: item.quantity,
      };
    });

    const sessionData: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: success_url || 'http://localhost:3000/success',
      cancel_url: cancel_url || 'http://localhost:3000/cart',
      metadata: {
        userId: userId || 'anonymous',
      },
    };

    try {
      const session = await this.stripeService.createCheckoutSession(sessionData);
      console.log("Stripe session created:", session);
      
      const order = await this.createOrder(checkoutData, session.id);
      console.log("Order created:", order);

      return { sessionId: session.id, orderId: order.id };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new InternalServerErrorException('Failed to create checkout session: ' + error.message);
    }
  }

  private async createOrder(checkoutData: CheckoutData, sessionId: string) {
    const { items, userId } = checkoutData;
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
    try {
      const createdOrder = await this.prisma.order.create({
        data: {
          userId: userId ? parseInt(userId) : null,
          totalAmount,
          status: 'pending',
          orderItems: {
            create: items.map(item => {
              const productId = parseInt(item.productId);
              // Vérification de productId pour éviter NaN
              if (isNaN(productId)) {
                throw new BadRequestException(`Invalid productId: ${item.productId} is not a number`);
              }
              return {
                quantity: item.quantity,
                price: item.price,
                product: {
                  connect: {
                    id: productId,
                  },
                },
              };
            }),
          },
          payment: {
            create: {
              amount: totalAmount,
              status: 'pending',
              stripeSessionId: sessionId,
              paymentMethod: 'stripe',
            },
          },
        },
        include: {
          orderItems: {
            include: {
              product: true,
            },
          },
          payment: true,
        },
      });
  
      console.log('Order created successfully:', createdOrder);
      return createdOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new InternalServerErrorException('Failed to create order: ' + error.message);
    }
  }
}
