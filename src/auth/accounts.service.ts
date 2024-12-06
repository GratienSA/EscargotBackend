import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OAuthDto } from './dto/oauth.dto'; 

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProviderAccountId(providerAccountId: string, provider: string): Promise<OAuthDto | null> {
    const account = await this.prisma.account.findFirst({
      where: {
        provider: provider,
        providerAccountId: providerAccountId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

 
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