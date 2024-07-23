import { IsEmail, IsNotEmpty, MaxLength, } from 'class-validator';
export class ResetPasswordDemandDto {
  @IsEmail({}, { message: 'L\'adresse email est invalide' })
  @IsNotEmpty()
  @MaxLength(255, { message: 'L\'email ne doit pas dépasser 255 caractères' })
  email: string;
}