import { IsNotEmpty, IsNumber, IsOptional, IsString, IsInt, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description: string;


  
  price: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  imagePath?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  rating?: number;
}
