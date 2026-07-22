import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Param,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SuperAppRegistry } from './adapters/super-app-registry';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private superAppRegistry: SuperAppRegistry,
  ) {}

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(AuthGuard('local'))
  @Post('login/email')
  async loginWithEmail(@Req() req: any) {
    return this.authService.login(req.user);
  }

  @Post('login/phone')
  async loginWithPhone(@Body() dto: LoginDto) {
    if (!dto.phone_number || !dto.password) {
      throw new UnauthorizedException('Phone number and password required');
    }
    const user = await this.authService.validateLocalUserByPhone(dto.phone_number, dto.password);
    if (!user) throw new UnauthorizedException('Invalid phone number or password');
    return this.authService.login(user);
  }

  @UseGuards(AuthGuard('telebirr'))
  @Post('login/telebirr')
  async loginWithTeleBirr(@Req() req: any) {
    return this.authService.login(req.user);
  }

  @UseGuards(AuthGuard('banking-api'))
  @Post('login/banking')
  async loginWithBanking(@Req() req: any) {
    return this.authService.login(req.user);
  }

  @Post('login/super-app/:provider')
  async loginWithSuperApp(
    @Param('provider') provider: string,
    @Body('code') code: string,
    @Body('redirect_uri') redirectUri: string,
  ) {
    const user = await this.authService.validateSuperAppUser(
      provider,
      code,
      redirectUri,
    );
    return this.authService.login(user);
  }

  @Get('super-app/:provider/authorize')
  getSuperAppAuthorizationUrl(
    @Param('provider') provider: string,
    @Query('state') state: string,
  ) {
    const adapter = this.superAppRegistry.get(provider);
    return { url: adapter.getAuthorizationUrl(state || Math.random().toString(36)) };
  }

  @Post('refresh')
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('fcm-token')
  async registerFcmToken(
    @Req() req: any,
    @Body('token') token: string,
    @Body('platform') platform: 'android' | 'ios',
  ) {
    await this.authService.registerPushToken(req.user.id, token, platform);
    return { registered: true };
  }
}
