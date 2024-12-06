import { IsString, IsOptional } from 'class-validator';

export class OAuthDto {
  @IsString()
  id?: number;

  @IsString()
  userId: number;

  @IsString()
  provider: string;

  @IsString()
  providerAccountId: string;

  @IsOptional()
  @IsString()
  refreshToken?: string;

  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsOptional()
  expiresAt?: number;

  @IsOptional()
  @IsString()
  tokenType?: string;

  @IsOptional()
  @IsString()
  scope?: string;

  @IsOptional()
  @IsString()
  idToken?: string;

  @IsOptional()
  @IsString()
  sessionState?: string;
}