import { IsEnum, IsNotEmpty } from 'class-validator';
import { PaymentMethod } from '@prisma/client'; 

export class PaymentMethodDto {
  @IsEnum(PaymentMethod) 
  @IsNotEmpty()
  type: PaymentMethod; 
}
