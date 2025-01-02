import { PaymentMethod } from "@prisma/client";

export class CreatePaymentDto {
    orderId: number;
    amount: number;
    paymentMethod: PaymentMethod;
  }