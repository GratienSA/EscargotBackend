import { IsString, IsInt, IsOptional, Min, Max, Length } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateAdviceDto } from './create.advice.dto';

export class UpdateAdviceDto extends PartialType(CreateAdviceDto) {
    @IsOptional()
    @IsString()
    @Length(10, 1000, { message: 'Le contenu doit contenir entre 10 et 1000 caractères' })
    content?: string;

    @IsOptional()
    @IsInt()
    @Min(1, { message: 'La note doit être au minimum 1' })
    @Max(5, { message: 'La note doit être au maximum 5' })
    rating?: number;
}