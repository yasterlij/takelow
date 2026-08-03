import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from './entities/user.entity';

@Injectable()
export class AuthTokenService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async generateTokens(
    user: User,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload = {
      sub: user.id,
      phone: user.phone_number,
      role: user.role,
      wallet_balance: user.wallet_balance,
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