import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(65, { message: 'Le prénom ne doit pas dépasser 65 caractères' })
  @Transform(({ value }) => value.trim())
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(65, { message: 'Le nom ne doit pas dépasser 65 caractères' })
  @Transform(({ value }) => value.trim())
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(180, { message: 'L\'adresse ne doit pas dépasser 180 caractères' })
  address: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(65, { message: 'La ville ne doit pas dépasser 65 caractères' })
  city: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20, { message: 'Le code postal ne doit pas dépasser 20 caractères' })
  @Matches(/^[0-9]{5}$/, { message: 'Le code postal doit contenir 5 chiffres' })
  postalCode: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(65, { message: 'Le pays ne doit pas dépasser 65 caractères' })
  country: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30, { message: 'Le numéro de téléphone ne doit pas dépasser 30 caractères' })
  @Matches(/^(\+33|0)[1-9](\d{2}){4}$/, { message: 'Le format du numéro de téléphone est invalide' })
  phone: string;

  @IsEmail({}, { message: 'L\'adresse email est invalide' })
  @IsNotEmpty()
  @MaxLength(255, { message: 'L\'email ne doit pas dépasser 255 caractères' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(255, { message: 'Le mot de passe ne doit pas dépasser 255 caractères' })
  password: string;
}
