import { Body, Controller, Delete, Post, UseGuards, Req, Res } from '@nestjs/common';
import { SignupDto } from './dto/signupDto';
import { AuthService } from './auth.service';
import { ResetPasswordDemandDto } from './dto/resetPasswordDemand';
import { ResetPasswordConfirmationDto } from './dto/resetPasswordConfirmationDto';
import { DeleteAccountDto } from './dto/DeleteAccountDto';
import { GetUser } from './decorator/get-user-decorator';
import { JwtGuard } from './guard/jwt.guard';
import { OAuthDto } from 'src/auth/dto/oauth.dto';
import { SigninDto } from './dto/signinDto';
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('/signup')
    signup(@Body() signupDto: SignupDto) {
        return this.authService.signup(signupDto);
    }

    @Post('/signin')
    async signin(@Body() signinDto: SigninDto) {
      return this.authService.signin(signinDto);
    }

    @Post('reset-password')
    resetPasswordDemand(@Body() resetPasswordDemandDto: ResetPasswordDemandDto) {
        return this.authService.resetPasswordDemand(resetPasswordDemandDto);
    }

    @Post('reset-password-confirmation')
    confirmPasswordReset(@Body() resetPasswordConfirmationDto: ResetPasswordConfirmationDto) {
        return this.authService.confirmPasswordReset(resetPasswordConfirmationDto);
    }

    @UseGuards(JwtGuard)
    @Delete('delete')
    deleteAccount(@GetUser() user: { id: number }, @Body() deleteAccountDto: DeleteAccountDto) {
        return this.authService.deleteAccount(user.id, deleteAccountDto);
    }

    @Post('oauth/login')
  async loginWithOAuth(@Body() body: { providerAccountId: string; provider: string }): Promise<OAuthDto> {
    return this.authService.loginWithOAuth(body.providerAccountId, body.provider);
  }
}