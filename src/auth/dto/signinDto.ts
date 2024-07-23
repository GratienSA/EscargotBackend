import { IsString, IsEmail, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class SigninDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(255, { message: 'Password must not exceed 255 characters' })
  password: string;
}
