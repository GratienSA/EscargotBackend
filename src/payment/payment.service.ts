import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async createPayment(createPaymentDto: CreatePaymentDto) {
    const { orderId, amount, paymentMethod } = createPaymentDto;

    // Vérifier si la commande existe
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    // Créer le paiement
    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        amount,
        status: 'PENDING',
        paymentMethod,
      },
    });

    // Mettre à jour le statut de la commande
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAYMENT_PENDING' },
    });

    return payment;
  }

  async updatePaymentStatus(paymentId: number, status: string, transactionId?: string) {
    const payment = await this.prisma.payment.update({
      where: { id: paymentId },
      data: { 
        status, 
        transactionId,
        updatedAt: new Date()
      },
    });

    // Mettre à jour le statut de la commande si le paiement est confirmé
    if (status === 'COMPLETED') {
      await this.prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID' },
      });
    }

    return payment;
  }

  async getPaymentByOrderId(orderId: number) {
    return this.prisma.payment.findUnique({
      where: { orderId },
    });
  }
}