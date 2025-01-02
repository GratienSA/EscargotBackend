import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateInventoryDto {
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @IsInt()
  @IsNotEmpty()
  quantity: number;
}