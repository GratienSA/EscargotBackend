import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as argon from 'argon2';
import { SignupDto } from './dto/signupDto';
import { SigninDto } from './dto/signinDto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ResetPasswordDemandDto } from './dto/resetPasswordDemand';
import * as speakeasy from 'speakeasy';
import { ResetPasswordConfirmationDto } from './dto/resetPasswordConfirmationDto';
import { DeleteAccountDto } from './dto/DeleteAccountDto';
import { EmailService } from 'src/email/email.service';
import { OAuthDto } from './dto/oauth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ForbiddenException('Email already taken');
    }

    const hash = await argon.hash(dto.password);

    try {
      const user = await this.prismaService.user.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          address: dto.address,
          city: dto.city,
          postalCode: dto.postalCode,
          country: dto.country,
          phone: dto.phone,
          email: dto.email,
          password: hash,
          role: {
            connect: {
              name: 'USER',
            },
          },
        },
        include: {
          role: true,
        },
      });

      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new ForbiddenException('Error creating user');
    }
  }

  async signin(dto: SigninDto) {
    const user = await this.prismaService.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new ForbiddenException('Invalid credentials');
    }

    const isValidPassword = await argon.verify(user.password, dto.password);
    if (!isValidPassword) {
      throw new ForbiddenException('Invalid credentials');
    }

    return this.signToken(user.id.toString());
  }

  async signToken(userId: string): Promise<{ access_token: string }> {
    const payload = { sub: userId };
    const secret = this.configService.get<string>('JWT_SECRET');
    const token = await this.jwtService.signAsync(payload, {
      expiresIn: '15d',
      secret: secret,
    });

    return { access_token: token };
  }

  async resetPasswordDemand(resetPasswordDemandDto: ResetPasswordDemandDto) {
    const { email } = resetPasswordDemandDto;
    const user = await this.prismaService.user.findUnique({ where: { email } });

    if (!user) throw new NotFoundException('User not found');

    const code = speakeasy.totp({
      secret: this.configService.get<string>('OTP_CODE'),
      digits: 5,
      step: 60 * 15,
      encoding: 'base32',
    });

    const url = 'http://localhost:3000/login';
    await this.emailService.sendResetPassword(user, url, code);

    return { message: 'Reset password mail has been sent' };
  }

  async confirmPasswordReset(
    resetPasswordConfirmationDto: ResetPasswordConfirmationDto,
  ) {
    const { code, email, password } = resetPasswordConfirmationDto;
    const user = await this.prismaService.user.findUnique({ where: { email } });

    if (!user) throw new NotFoundException('User not found');

    const isValidCode = speakeasy.totp.verify({
      secret: this.configService.get<string>('OTP_CODE'),
      encoding: 'base32',
      token: code,
      step: 60 * 15,
    });

    if (!isValidCode) throw new BadRequestException('Invalid code');

    const hashedPassword = await argon.hash(password);
    await this.prismaService.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    return { message: 'Password has been changed' };
  }

  async deleteAccount(userId: number, deleteAccountDto: DeleteAccountDto) {
    const { password } = deleteAccountDto;
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const isValidPassword = await argon.verify(user.password, password);
    if (!isValidPassword) throw new BadRequestException('Invalid password');

    await this.prismaService.user.delete({ where: { id: userId } });

    return { message: 'Account has been deleted' };
  }


  async loginWithOAuth(providerAccountId: string, provider: string): Promise<OAuthDto | null> {
    const account = await this.prismaService.account.findFirst({
      where: {
        provider,
        providerAccountId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }
 
 const user = await this.prismaService.user.findUnique({
  where: { id: account.userId }, 
});

if (!user) {
  throw new NotFoundException('User not found');
}


const token = await this.signToken(user.id.toString());
    const oauthDto: OAuthDto = {
      id: account.id,
      userId: account.userId,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      refreshToken: account.refresh_token,
      accessToken: account.access_token,
      expiresAt: account.expires_at,
      tokenType: account.token_type,
      scope: account.scope,
      idToken: account.id_token,
      sessionState: account.session_state,
    };

    return oauthDto;
  }
}