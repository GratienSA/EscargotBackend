import {
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsEnum,
  IsBoolean,
  IsDate,
  IsOptional,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// DTO pour un élément de commande
export class OrderItemDto {
  @IsNotEmpty()
  @IsNumber()
  productId: number;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))  // Transformation en float avant validation
  @IsNumber()
  price: number; // Utilisation de number plutôt que Decimal pour simplification
}

// DTO pour la création d'une commande
export class CreateOrderDto {
  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsString()
  shippingStreet: string;

  @IsNotEmpty()
  @IsString()
  shippingCity: string;

  @IsNotEmpty()
  @IsString()
  shippingZip: string;

  @IsOptional()
  @IsString()
  shippingCountry?: string; // Optionnel

  @IsNotEmpty()
  @IsEnum(PaymentMethod, { message: 'Méthode de paiement invalide.' })
  paymentMethod: PaymentMethod;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  orderItems: OrderItemDto[];

  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))  // Transformation en float avant validation
  @IsNumber()
  itemsPrice: number; // Utilisation de number au lieu de Decimal

  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))  // Transformation en float avant validation
  @IsNumber()
  shippingPrice: number;

  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))  // Transformation en float avant validation
  @IsNumber()
  taxPrice: number;

  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))  // Transformation en float avant validation
  @IsNumber()
  totalAmount: number;
}

// DTO pour une commande complète
export class OrderDto {
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @IsNumber()
  userId: number;

  @IsNotEmpty()
  @IsString()
  shippingStreet: string;

  @IsNotEmpty()
  @IsString()
  shippingCity: string;

  @IsNotEmpty()
  @IsString()
  shippingZip: string;

  @IsOptional()
  @IsString()
  shippingCountry?: string;

  @IsNotEmpty()
  @IsEnum(PaymentMethod, { message: 'Méthode de paiement invalide.' })
  paymentMethod: PaymentMethod;

  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))  // Transformation en float avant validation
  @IsNumber()
  itemsPrice: number;  // Utilisation de number pour éviter la validation d'un Decimal

  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))  // Transformation en float avant validation
  @IsNumber()
  shippingPrice: number;

  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))  // Transformation en float avant validation
  @IsNumber()
  taxPrice: number;

  @IsNotEmpty()
  @Transform(({ value }) => parseFloat(value))  // Transformation en float avant validation
  @IsNumber()
  totalAmount: number;

  @IsNotEmpty()
  @IsString()
  status: string;

  @IsNotEmpty()
  @IsDate()
  createdAt: Date;

  @IsNotEmpty()
  @IsDate()
  updatedAt: Date;

  @IsNotEmpty()
  @IsBoolean()
  isPaid: boolean;

  @IsOptional()
  @IsDate()
  paidAt?: Date;

  @IsOptional()
  @IsBoolean()
  isDelivered?: boolean;

  @IsOptional()
  @IsDate()
  deliveredAt?: Date;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  orderItems: OrderItemDto[];

  @IsOptional()
  @IsString()
  paymentResult?: string;
}
