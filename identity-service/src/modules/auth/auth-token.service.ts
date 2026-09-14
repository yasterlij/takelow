import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthTokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async generateTokens(
    user: { id: string; phone_number: string | null; role: string; wallet_balance: any; is_banned: boolean; tc_accepted?: boolean },
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload = {
      sub: user.id,
      phone: user.phone_number,
      role: user.role,
      wallet_balance: Number(user.wallet_balance),
      is_banned: user.is_banned,
      tc_accepted: user.tc_accepted ?? false,
    };

    const access_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('app.jwtSecret'),
      expiresIn: '15m',
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('app.jwtRefreshSecret'),
      expiresIn: '7d',
    });

    return { access_token, refresh_token };
  }

  verifyRefreshToken(refreshToken: string): any {
    return this.jwtService.verify(refreshToken, {
      secret: this.configService.get<string>('app.jwtRefreshSecret'),
    });
  }
}