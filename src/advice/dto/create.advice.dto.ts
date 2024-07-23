import { IsString, IsInt, IsNotEmpty, Min, Max, Length } from 'class-validator';

export class CreateAdviceDto {
    @IsString()
    @IsNotEmpty()
    @Length(10, 1000, { message: 'Le contenu doit contenir entre 10 et 1000 caractères' })
    content: string;

    @IsInt()
    @Min(1, { message: 'La note doit être au minimum 1' })
    @Max(5, { message: 'La note doit être au maximum 5' })
    rating: number;

    @IsInt()
    @IsNotEmpty()
    productId: number;
}