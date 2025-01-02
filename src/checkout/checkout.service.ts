import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { StripeService } from '../stripe/stripe.service';
import { PrismaService } from '../prisma/prisma.service';
import { CheckoutData } from './interfaces/checkout-data.interface';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';

@Injectable()
export class CheckoutService {
  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
  ) {}

  async createCheckoutSession(checkoutData: CheckoutData) {
    console.log('CheckoutService received data:', JSON.stringify(checkoutData, null, 2));
  
    const { items, userId, success_url, cancel_url } = checkoutData;
  
    // Validation des éléments du panier
    if (!items || items.length === 0) {
      throw new BadRequestException('No items found in checkout data');
    }
  
    // Vérification de l'existence de userId (assurez-vous que c'est un nombre)
    if (!userId || typeof userId !== 'number') {
      throw new BadRequestException('Valid userId is required');
    }
  
    // Calculs des montants
    const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemsPrice = totalAmount; // ou calculer différemment si nécessaire
    const shippingPrice = 0; // ou calculer si nécessaire
    const taxPrice = 0; // ou calculer si nécessaire
  
    // Créer la commande dans la base de données
    let order;
    try {
      order = await this.prisma.order.create({
        data: {
          userId: userId, // Ensure this is a valid number
          totalAmount: totalAmount,
          orderItems: {
            create: items.map(item => ({
              productId: item.productId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
          },
          shippingStreet: checkoutData.shippingStreet,
          shippingCity: checkoutData.shippingCity,
          shippingZip: checkoutData.shippingZip,
          paymentMethod: checkoutData.paymentMethod,
          taxPrice: taxPrice,
          itemsPrice: itemsPrice,
          shippingPrice: shippingPrice,
        } as unknown as Prisma.OrderCreateInput, // Explicitly type this part
      });
     
      console.log('Order created:', order);
    } catch (error) {
      console.error('Error creating order in database:', error);
      throw new InternalServerErrorException('Failed to create order in database');
    }
  
    // Préparer les éléments de la session Stripe
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(item => {
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
          unit_amount: Math.round(item.price * 100), // Convertir en centimes
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
        userId: userId.toString(), // Convertir en string si nécessaire
        orderId: order.id, // Ajouter l'ID de la commande dans les métadonnées
      },
    };
  
    try {
      const session = await this.stripeService.createCheckoutSession(sessionData);
      console.log('Session Stripe créée avec succès:', session);
      return { sessionId: session.id, orderId: order.id };
    } catch (error) {
      console.error('Erreur lors de la création de la session Stripe:', error);
      throw new InternalServerErrorException(
        'Échec de la création de la session de paiement: ' + error.message,
      );
    }
  }
  
  



  async createOrder(checkoutData: CheckoutData, sessionId: string) {
    const { items, userId } = checkoutData;
  
    try {
      return await this.prisma.$transaction(async tx => {
        // Vérifier si l'utilisateur existe
        let user = null;
        if (userId) {
          user = await tx.user.findUnique({ where: { id: userId } });
          if (!user) throw new NotFoundException('Utilisateur non trouvé');
        }
  
        // Calculer les montants
        const itemsPrice = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
        const taxPrice = itemsPrice * 0.2; // 20% de taxe
        const shippingPrice = 5; // Frais fixes
        const totalAmount = itemsPrice + taxPrice + shippingPrice;
  
        // Créer la commande
        const orderData: Prisma.OrderCreateInput = {
          user: userId ? { connect: { id: userId } } : undefined,
          shippingStreet: user?.address?.street || '', // Assuming user address is structured as { street, city, zip }
          shippingCity: user?.address?.city || '',
          shippingZip: user?.address?.zip || '',
          paymentMethod: 'stripe',
          itemsPrice: parseFloat(itemsPrice.toFixed(2)), // Conversion en number
          taxPrice: parseFloat(taxPrice.toFixed(2)), // Conversion en number
          shippingPrice: parseFloat(shippingPrice.toFixed(2)), // Conversion en number
          totalAmount: parseFloat(totalAmount.toFixed(2)), // Conversion en number
          status: 'PENDING',
          orderItems: {
            create: items.map(item => {
              const productId = item.productId;
              if (isNaN(productId)) {
                throw new BadRequestException(
                  `Invalid productId: ${item.productId} is not a number`,
                );
              }
              return {
                quantity: item.quantity,
                price: parseFloat(item.price.toFixed(2)), // Conversion en number
                product: { connect: { id: productId } },
              };
            }),
          },
          payment: {
            create: {
              amount: parseFloat(totalAmount.toFixed(2)), // Conversion en number
              status: 'pending',
              stripeSessionId: sessionId,
              paymentMethod: 'stripe',
            },
          },
        };
  
        const createdOrder = await tx.order.create({
          data: orderData,
          include: {
            orderItems: { include: { product: true } },
            payment: true,
          },
        });
  
        // Mettre à jour le stock des produits (vérifier la quantité en stock)
        for (const item of items) {
          const productId = item.productId;
  
          // Récupérer les informations du produit et de l'inventaire
          const product = await tx.product.findUnique({
            where: { id: productId },
          });
  
          // Vérifier si le produit existe
          if (!product) {
            throw new BadRequestException(
              `Produit non trouvé: ${item.productId}`,
            );
          }
  
          // Récupérer la quantité du produit dans l'inventaire
          const inventory = await tx.inventory.findUnique({
            where: { productId: productId },
          });
  
          if (!inventory || inventory.quantity < item.quantity) {
            throw new BadRequestException(
              `Stock insuffisant pour le produit ${item.productId}`,
            );
          }
  
          // Si tout est bon, mettre à jour le stock
          await tx.inventory.update({
            where: { productId: productId },
            data: { quantity: { decrement: item.quantity } },
          });
        }
  
        // Si l'utilisateur est connecté, vider son panier
        if (userId) {
          await tx.cart.update({
            where: { userId: userId },
            data: { cartProducts: { deleteMany: {} } },
          });
        }
  
        console.log('Order created successfully:', createdOrder);
        return createdOrder;
      });
    } catch (error) {
      console.error('Error creating order:', error);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Failed to create order: ' + error.message,
      );
    }
  }
}
  