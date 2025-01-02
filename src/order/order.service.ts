import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateOrderDto, OrderDto } from './dto/create-order.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeService } from 'src/stripe/stripe.service';
import { EmailService } from '../email/email.service';
import Stripe from 'stripe';
import { PaymentResult } from 'src/types';
import { Decimal } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config'; 

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name)
  updateOrderStatus() {
    throw new Error('Method not implemented.');
  }
  getUserOrders() {
    throw new Error('Method not implemented.');
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,  
  ) {}

  async getOrderById(orderId: number) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: true,
        user: {
          select: {
            firstName: true,
            email: true,
          },
        },
      },
    });
  }

  async getMyOrders(userId: number, page: number, limit: number) {
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
    try {
      const [
        ordersCount,
        productsCount,
        usersCount,
        ordersPrice,
        salesData,
        latestOrders,
      ] = await Promise.all([
        this.prisma.order.count(),
        this.prisma.product.count(),
        this.prisma.user.count(),
        this.prisma.order.aggregate({ _sum: { totalAmount: true } }),
        this.prisma.$queryRaw`
          SELECT 
            DATE_FORMAT(createdAt, '%m/%Y') as months,
            SUM(totalAmount) as totalSales
          FROM \`Order\`  -- Escape the table name
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
    } catch (error) {
      this.logger.error('Error fetching order summary', error.stack);
      throw new InternalServerErrorException('Failed to fetch order summary');
    }
  }
  
  
  async getAllOrders(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: OrderDto[]; totalPages: number }> {
    // Récupérer les commandes avec pagination
    const orders = await this.prisma.order.findMany({
      skip: (page - 1) * limit, // Calculer l'offset pour la pagination
      take: limit, // Limite des résultats par page
      include: {
        orderItems: true, // Inclure les éléments de commande
      },
    });

    const orderDtos: OrderDto[] = orders.map(order => ({
      id: order.id,
      userId: order.userId,
      shippingStreet: order.shippingStreet,
      shippingCity: order.shippingCity,
      shippingZip: order.shippingZip,
      paymentMethod: order.paymentMethod,
      taxPrice: order.taxPrice, // Convertir Decimal en number
      totalAmount: order.totalAmount, // Convertir Decimal en number
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      itemsPrice: order.itemsPrice, // Convertir Decimal en number
      shippingPrice: order.shippingPrice, // Convertir Decimal en number
      isPaid: order.isPaid,
      paidAt: order.paidAt,
      isDelivered: order.isDelivered ?? false,
      deliveredAt: order.deliveredAt,
      orderItems: order.orderItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      })),
    }));
    
    // Calcul du nombre total de pages
    const totalOrders = await this.prisma.order.count(); // Compter le nombre total de commandes
    const totalPages = Math.ceil(totalOrders / limit); // Calculer le nombre total de pages
    
    // Retourner les données et le nombre de pages
    return { data: orderDtos, totalPages };
}   


 
  
    async createOrder(
      userId: number,
      createOrderDto: CreateOrderDto,
    ): Promise<{ order: OrderDto; sessionId: string }> {
      this.logger.log(`Création de commande pour l'utilisateur ${userId}`);
  
      // Valider l'existence de l'utilisateur
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('Utilisateur non trouvé');
  
      // Valider les données entrantes
      this.validateOrderData(createOrderDto);
  
      // Valider l'existence des produits et vérifier les stocks
      await this.validateProductsAndStock(createOrderDto.orderItems);

  
      // Calculer les prix
      const { calculatedItemsPrice, calculatedTaxPrice, calculatedTotalAmount } = this.calculatePrices(createOrderDto);
  
      // Comparer les prix calculés avec ceux fournis dans createOrderDto
      this.comparePrices(createOrderDto, calculatedItemsPrice, calculatedTaxPrice, calculatedTotalAmount);
  
      // Créer la commande dans la base de données
      const order = await this.createOrderInDatabase(userId, createOrderDto);
  
      // Créer une session Stripe pour le paiement
      const session = await this.createStripeSession(createOrderDto);
  
      return {
        order: this.mapOrderToDto(order),
        sessionId: session.id,
      };
    }
  
    private validateOrderData(createOrderDto: CreateOrderDto): void {
      if (!createOrderDto.shippingStreet || !createOrderDto.shippingCity || !createOrderDto.shippingZip) {
        throw new BadRequestException("L'adresse de livraison est incomplète");
      }
      if (!createOrderDto.paymentMethod) {
        throw new BadRequestException('Le mode de paiement est requis');
      }
      if (!createOrderDto.orderItems || createOrderDto.orderItems.length === 0) {
        throw new BadRequestException('Le panier est vide');
      }
  
      createOrderDto.orderItems.forEach((item, index) => {
        if (!item.productId || !item.quantity || item.price == null) {
          throw new BadRequestException(
            `L'article du panier à l'index ${index} est invalide : 'productId', 'quantity' et 'price' sont requis`,
          );
        }
        if (new Decimal(item.price).isNegative()) {
          throw new BadRequestException('Les prix ne peuvent pas être négatifs');
        }
        if (item.quantity <= 0 || !Number.isInteger(item.quantity)) {
          throw new BadRequestException('Les quantités doivent être des entiers positifs');
        }
      });
    }
  
   // Valider l'existence des produits et vérifier les stocks
   private async validateProductsAndStock(orderItems: CreateOrderDto['orderItems']): Promise<void> {
    const productIds = orderItems.map(item => item.productId);
    const inventories = await this.prisma.inventory.findMany({
      where: { productId: { in: productIds } },
      include: { product: true },
    });
  
    // Vérification d'existence des produits
    if (inventories.length !== productIds.length) {
      throw new NotFoundException('Un ou plusieurs produits ne sont pas disponibles ou supprimés');
    }
  
    // Vérification des stocks et des quantités
    const MAX_QUANTITY = 50;
    orderItems.forEach(item => {
      const inventory = inventories.find(inv => inv.productId === item.productId);
      if (!inventory) {
        throw new NotFoundException(`Produit ID ${item.productId} non trouvé`);
      }
      if (inventory.quantity < item.quantity) {
        throw new BadRequestException(`Produit ID ${item.productId} : stock insuffisant (${inventory.quantity} disponibles)`);
      }
      if (item.quantity > MAX_QUANTITY) {
        throw new BadRequestException(`Produit ID ${item.productId} : quantité excessive (max : ${MAX_QUANTITY})`);
      }
    });
  }
  
  
  
  
    private calculatePrices(createOrderDto: CreateOrderDto) {
      const calculatedItemsPrice = createOrderDto.orderItems.reduce(
        (sum, item) => sum.plus(new Decimal(item.quantity).times(new Decimal(item.price))),
        new Decimal(0)
      );
      const calculatedTaxPrice = calculatedItemsPrice.times(new Decimal(0.2));
      const calculatedTotalAmount = calculatedItemsPrice
        .plus(calculatedTaxPrice)
        .plus(new Decimal(createOrderDto.shippingPrice || 0));
  
      return { calculatedItemsPrice, calculatedTaxPrice, calculatedTotalAmount };
    }
  
    private comparePrices(
      createOrderDto: CreateOrderDto,
      calculatedItemsPrice: Decimal,
      calculatedTaxPrice: Decimal,
      calculatedTotalAmount: Decimal
    ): void {
      if (!calculatedItemsPrice.equals(new Decimal(createOrderDto.itemsPrice))) {
        throw new BadRequestException(`Les montants des articles ne correspondent pas. Calculé: ${calculatedItemsPrice.toString()}, Fournis: ${createOrderDto.itemsPrice}`);
      }
      if (!calculatedTaxPrice.equals(new Decimal(createOrderDto.taxPrice))) {
        throw new BadRequestException(`Les montants de la taxe ne correspondent pas. Calculé: ${calculatedTaxPrice.toString()}, Fournis: ${createOrderDto.taxPrice}`);
      }
      if (!calculatedTotalAmount.equals(new Decimal(createOrderDto.totalAmount))) {
        throw new BadRequestException(`Les montants totaux ne correspondent pas. Calculé: ${calculatedTotalAmount.toString()}, Fournis: ${createOrderDto.totalAmount}`);
      }
    }
    
  
    private async createOrderInDatabase(userId: number, createOrderDto: CreateOrderDto) {
      const orderItems = createOrderDto.orderItems.map(item => ({
        quantity: item.quantity,
        price: parseFloat(item.price.toString()),  // Transformation en number
        product: { connect: { id: item.productId } },
      }));
    
      try {
        this.logger.log('Début de la création de la commande dans la base de données');
    
        const order = await this.prisma.$transaction(async (prisma) => {
          const order = await prisma.order.create({
            data: {
              userId,
              shippingStreet: createOrderDto.shippingStreet,
              shippingCity: createOrderDto.shippingCity,
              shippingZip: createOrderDto.shippingZip,
              paymentMethod: createOrderDto.paymentMethod,
              itemsPrice: parseFloat(createOrderDto.itemsPrice.toString()), 
              taxPrice: parseFloat(createOrderDto.taxPrice.toString()),
              shippingPrice: parseFloat(createOrderDto.shippingPrice?.toString() || '0'), 
              totalAmount: parseFloat(createOrderDto.totalAmount.toString()), 
              status: 'PENDING',
              isPaid: false,
              orderItems: {
                create: orderItems,
              },
            },
            include: {
              orderItems: true,
            },
          });
    
          return order;
        });
    
        this.logger.log('Commande créée avec succès');
        return order;
    
      } catch (error) {
        this.logger.error('Erreur lors de la création de la commande dans la base de données', error);
        throw new Error('Erreur lors de la création de la commande');
      }
    }
    
    
  
    private  async createStripeSession(createOrderDto: CreateOrderDto): Promise<Stripe.Checkout.Session> {
      const baseUrl = this.configService.get<string>('FRONTEND_URL');
      if (!baseUrl) {
        throw new Error('FRONTEND_URL is not defined in environment variables');
      }
      const sessionData: Stripe.Checkout.SessionCreateParams = {
        payment_method_types: ['card'],
        line_items: createOrderDto.orderItems.map(item => ({
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Produit ${item.productId}`,
            },
            unit_amount: new Decimal(item.price).times(100).toNumber(),
          },
          quantity: item.quantity,
        })),
        mode: 'payment',
        success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/cart`,
      };
      // Vérifier ici que la réponse contient bien `sessionId`
      const session = await this.stripeService.createCheckoutSession(sessionData);
      if (!session.id) {
        throw new Error("Session ID manquant lors de la création de la session Stripe");
      }
      return session;
    }
    
    private mapOrderToDto(order: any): OrderDto {
      return {
        id: order.id,
        userId: order.userId,
        shippingStreet: order.shippingStreet,
        shippingCity: order.shippingCity,
        shippingZip: order.shippingZip,
        paymentMethod: order.paymentMethod,
        taxPrice: order.taxPrice.toString(),
        totalAmount: order.totalAmount.toString(),
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        itemsPrice: order.itemsPrice.toString(),
        shippingPrice: order.shippingPrice.toString(),
        isPaid: order.isPaid,
        orderItems: order.orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price.toString(),
        })),
      };
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
              currency: 'eur', // Changez cela selon votre devise
              product_data: {
                name: 'Commande #' + order.id, // Nom du produit
              },
              unit_amount: Math.round(order.totalAmount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/cart`,
      };

      const session =
        await this.stripeService.createCheckoutSession(sessionData);

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
      return { success: false, message: 'Session de paiement Stripe échoués' };
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
        throw new Error("Le paiement Stripe n'a pas été effectué");
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
      return {
        success: false,
        message: "Votre commande n'a pas été payée avec succès via Stripe",
      };
    }
  }

  async updateOrderToPaid(orderId: number, paymentResult?: PaymentResult) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderItems: true },
    });

    if (!order) throw new NotFoundException('Commande non trouvée');
    if (order.isPaid)
      throw new BadRequestException('La commande est déjà payée');

    try {
      await this.prisma.$transaction(async tx => {
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
            paymentResult: paymentResult ? JSON.stringify(paymentResult) : null,
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
      throw new InternalServerErrorException(
        'Erreur lors de la mise à jour de la commande',
      );
    }
  }
  private async sendPurchaseReceipt(order) {
    await this.emailService.sendPurchaseReceipt(order);
  }

  async updateOrderToPaidByCOD(orderId: number) {
    try {
      const updatedOrder = await this.updateOrderToPaid(orderId, undefined);
      return {
        success: true,
        message: 'Commande payée avec succès',
        order: updatedOrder,
      };
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
      if (!order.isPaid)
        throw new BadRequestException("La commande n'est pas payée");

      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          isDelivered: true,
          deliveredAt: new Date(),
        },
      });
      return { success: true, message: 'Commande livrée avec succès' };
    } catch (err) {
      throw new InternalServerErrorException(
        'Erreur lors de la livraison de la commande : ' + err.message,
      );
    }
  }
}
