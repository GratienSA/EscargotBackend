import { IsString, IsEmail, IsOptional, MinLength, MaxLength, Matches, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class InsertUserDto  {
  @IsOptional()
  @IsString()
  @MaxLength(65, { message: 'Le prénom ne doit pas dépasser 65 caractères' })
  @Transform(({ value }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(65, { message: 'Le nom ne doit pas dépasser 65 caractères' })
  @Transform(({ value }) => value?.trim())
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180, { message: 'L\'adresse ne doit pas dépasser 180 caractères' })
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(65, { message: 'La ville ne doit pas dépasser 65 caractères' })
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Le code postal ne doit pas dépasser 20 caractères' })
  @Matches(/^[0-9]{5}$/, { message: 'Le code postal doit contenir 5 chiffres' })
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(65, { message: 'Le pays ne doit pas dépasser 65 caractères' })
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30, { message: 'Le numéro de téléphone ne doit pas dépasser 30 caractères' })
  @Matches(/^(\+33|0)[1-9](\d{2}){4}$/, { message: 'Le format du numéro de téléphone est invalide' })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'L\'adresse email est invalide' })
  @MaxLength(255, { message: 'L\'email ne doit pas dépasser 255 caractères' })
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(255, { message: 'Le mot de passe ne doit pas dépasser 255 caractères' })
  // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
  //   message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial',
  // })
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  gdprConsent?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'L\'URL de l\'image ne doit pas dépasser 255 caractères' })
  profileImagePath?: string;
}