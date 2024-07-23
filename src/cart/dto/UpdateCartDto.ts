
import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(0, { message: 'Quantity must be 0 or greater' })
  quantity: number;
}
