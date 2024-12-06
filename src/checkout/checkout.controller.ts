import { Controller, Post, Body, InternalServerErrorException, Req, BadRequestException } from '@nestjs/common';
import {jwtDecode} from 'jwt-decode';
import { Request } from 'express';
import { CheckoutData } from './interfaces/checkout-data.interface';
import { CheckoutService } from './checkout.service';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  async createCheckoutSession(@Body() checkoutData: CheckoutData, @Req() req: Request) {
    console.log("Received checkout request:", JSON.stringify(checkoutData, null, 2));

    const token = req.headers.authorization?.split(' ')[1];
    let userId: string | undefined;

    if (token) {
      try {
        const decoded = jwtDecode<{ sub: string }>(token); 
        userId = decoded.sub;
      } catch (error) {
        console.error('Error decoding token:', error);
        throw new BadRequestException('Invalid authentication token');
      }
    }

    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    try {
      const { items, success_url, cancel_url } = checkoutData;

      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new BadRequestException('Invalid or empty items array');
      }

      // Validate each item in the array
      items.forEach((item, index) => {
        if (!item.productId || typeof item.productId !== 'string' || isNaN(parseInt(item.productId))) {
          throw new BadRequestException(`Invalid productId for item at index ${index}`);
        }
        if (!item.name || typeof item.name !== 'string') {
          throw new BadRequestException(`Invalid name for item at index ${index}`);
        }
        if (!item.price || typeof item.price !== 'number' || item.price <= 0) {
          throw new BadRequestException(`Invalid price for item at index ${index}`);
        }
        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
          throw new BadRequestException(`Invalid quantity for item at index ${index}`);
        }
        if (item.image && typeof item.image !== 'string') {
          throw new BadRequestException(`Invalid image URL for item at index ${index}`);
        }
      });

      const session = await this.checkoutService.createCheckoutSession({
        items,
        userId,
        success_url: success_url || 'http://localhost:3000/success',
        cancel_url: cancel_url || 'http://localhost:3000/cart',
      });

      console.log("Stripe session created:", session.sessionId);
      return { sessionId: session.sessionId };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new InternalServerErrorException('Failed to create checkout session: ' + error.message);
    }
  }
}
