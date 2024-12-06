import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeService } from 'src/stripe/stripe.service';
import { EmailService } from '../email/email.service';
import Stripe from 'stripe';
import { PaymentResult } from 'src/types';

@Injectable()
export class OrdersService {
  updateOrderStatus(arg0: number, status: string) {
    throw new Error('Method not implemented.');
  }
  getUserOrders(id: number) {
    throw new Error('Method not implemented.');
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly emailService: EmailService,
   
  ) {}

  async getOrderById(orderId:number) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        user: {
          select: {
            firstName: true,
            email: true
          }
        }
      }
    });
  }

  async getMyOrders(userId:number, page: number, limit: number) {
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.order.count({ where: { userId } }),
    ]);

    return {
      data: orders,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getOrderSummary() {
    const [ordersCount, productsCount, usersCount, ordersPrice, salesData, latestOrders] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.product.count(),
      this.prisma.user.count(),
      this.prisma.order.aggregate({ _sum: { totalAmount: true } }),
      this.prisma.$queryRaw`
        SELECT 
          DATE_FORMAT(createdAt, '%m/%Y') as months,
          SUM(totalAmount) as totalSales
        FROM orders
        GROUP BY months
      `,
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { user: { select: { firstName: true } } },
      }),
    ]);

    return {
      ordersCount,
      productsCount,
      usersCount,
      ordersPrice: ordersPrice._sum.totalAmount || 0,
      salesData,
      latestOrders,
    };
  }


async getAllOrders(limit: number = 10, page: number = 1) {
  const [orders, totalCount] = await Promise.all([
    this.prisma.order.findMany({
      orderBy: { createdAt: 'desc' }, 
      take: limit, 
      skip: (page - 1) * limit, 
      include: {
        user: { select: { firstName: true } }, 
      },
    }),
    this.prisma.order.count(), 
  ]);

  return {
    data: orders,
    totalPages: Math.ceil(totalCount / limit),
  };
}

async createOrder(userId: number, createOrderDto: CreateOrderDto) {
  
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundException('Utilisateur non trouvé');
  
 
  const shippingAddress = createOrderDto.shippingAddress || user.address;
  const paymentMethod = createOrderDto.paymentMethod || user.paymentMethod;

  if (!shippingAddress) throw new BadRequestException('L’adresse de livraison est requise');
  if (!paymentMethod) throw new BadRequestException('Le mode de paiement est requis');

  // Récupérer le panier
  const cart = await this.prisma.cart.findUnique({
    where: { userId },
    include: { cartProducts: { include: { product: true } } },
  });
  if (!cart || cart.cartProducts.length === 0) throw new BadRequestException('Le Panier est vide');

  // Calculer les montants
  const itemsPrice = cart.cartProducts.reduce(
    (sum, item) => sum + item.quantity * item.product.price,
    0,
  );
  const taxPrice = itemsPrice * 0.2; // Exemple : 20% de taxe
  const shippingPrice = 5; // Exemple : frais fixes
  const totalPrice = itemsPrice + taxPrice + shippingPrice;

  // Créer la commande dans une transaction
  return this.prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId,
        shippingAddress,
        paymentMethod,
        itemsPrice: parseFloat(itemsPrice.toFixed(2)),
        taxPrice: parseFloat(taxPrice.toFixed(2)),
        shippingPrice: parseFloat(shippingPrice.toFixed(2)),
        totalAmount: parseFloat(totalPrice.toFixed(2)),
        status: "PENDING", 
      }
    });

    // Ajouter les articles de la commande
    for (const item of cart.cartProducts) {
      await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          quantity: item.quantity,
          price: parseFloat(item.product.price.toFixed(2)), // S'assurer que le prix est bien formaté
        },
      });

      // Mettre à jour le stock des produits
      await tx.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    // Réinitialiser le panier en supprimant tous les produits
    await tx.cart.update({
      where: { id: cart.id },
      data: {
        cartProducts: {
          deleteMany: {},
        },
      },
    });

    return order.id; 
  });
}

async deleteOrder(id: number) {
  try {
    const orderExists = await this.prisma.order.findUnique({ where: { id } });
    if (!orderExists) throw new NotFoundException('Commande non trouvée');

    await this.prisma.order.delete({ where: { id } });
    return { success: true, message: 'Commande supprimée avec succès' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}


async createStripeOrder(orderId: number) {
  try {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Commande non trouvée');
    }

    // Créer une session de paiement Stripe
    const sessionData: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd', // Changez cela selon votre devise
            product_data: {
              name: 'Commande #' + order.id, // Nom du produit
            },
            unit_amount: Math.round(order.totalAmount * 100), // Montant en cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment', 
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    };

    const session = await this.stripeService.createCheckoutSession(sessionData);

    // Mettre à jour la commande avec les détails du paiement
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentResult: {
          id: session.id,
          status: session.payment_status,
          pricePaid: order.totalAmount.toString(),
        },
      },
    });

    return {
      success: true,
      message: 'Session de paiement Stripe créée avec succès',
      data: session.id,
    };
  } catch (err) {
    return { success: false, message:'Session de paiement Stripe échoués'};
  }
}


async approveStripeOrder(orderId: number, data: { sessionId: string }) {
  try {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Commande non trouvée');

    // Récupérer la session de paiement Stripe
    const session = await this.stripeService.retrieveSession(data.sessionId);

    // Vérifier si le paiement a été effectué
    if (session.payment_status !== 'paid') {
      throw new Error('Le paiement Stripe n\'a pas été effectué');
    }

    // Mettre à jour la commande avec les détails du paiement
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        isPaid: true,
        paidAt: new Date(),
        paymentResult: {
          id: session.id,
          status: session.payment_status,
          email_address: session.customer_email || '', // Assurez-vous que l'email est disponible
          pricePaid: session.amount_total / 100, // Montant payé en dollars
        },
      },
    });

    return {
      success: true,
      message: 'Votre commande a été payée avec succès via Stripe',
    };
  } catch (err) {
    return { success: false, message: 'Votre commande n\'a pas été payée avec succès via Stripe' };
  }
}

async updateOrderToPaid(orderId: number, paymentResult?: PaymentResult) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: { orderItems: true },
  });

  if (!order) throw new NotFoundException('Commande non trouvée');
  if (order.isPaid) throw new BadRequestException('La commande est déjà payée');

  try {
    await this.prisma.$transaction(async (tx) => {
      for (const item of order.orderItems) {
      await tx.inventory.update({
        where: { productId: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
      }

      await tx.order.update({
        where: { id: orderId },
        data: {
          isPaid: true,
          paidAt: new Date(),
          paymentResult: paymentResult ? JSON.stringify(paymentResult) : null
        },
      });
    });

    const updatedOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        user: { select: { firstName: true, email: true } },
      },
    });

    if (!updatedOrder) throw new NotFoundException('Commande non trouvée');

    await this.sendPurchaseReceipt(updatedOrder);

    return updatedOrder;
  } catch (error) {
    throw new InternalServerErrorException('Erreur lors de la mise à jour de la commande');
  }
}
private async sendPurchaseReceipt(order) {
  await this.emailService.sendPurchaseReceipt(order);
}

async updateOrderToPaidByCOD(orderId: number) {
  try {
    const updatedOrder = await this.updateOrderToPaid(orderId, undefined);
    return { success: true, message: 'Commande payée avec succès', order: updatedOrder };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async deliverOrder(orderId: number) {
  try {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) throw new NotFoundException('Commande non trouvée');
    if (!order.isPaid) throw new BadRequestException('La commande n\'est pas payée');

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        isDelivered: true,
        deliveredAt: new Date(),
      },
    });
    return { success: true, message: 'Commande livrée avec succès' };
  } catch (err) {
    throw new InternalServerErrorException('Erreur lors de la livraison de la commande : ' + err.message);
  }
}
}