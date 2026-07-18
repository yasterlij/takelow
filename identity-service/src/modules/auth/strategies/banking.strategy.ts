import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class BankingStrategy extends PassportStrategy(Strategy, 'banking-api') {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(req: Request): Promise<any> {
    const { api_token, bank_account } = req.body;

    if (!api_token) {
      throw new UnauthorizedException('Banking API token required');
    }

    try {
      const user = await this.authService.validateBankingUser(
        api_token,
        bank_account,
      );
      return user;
    } catch {
      throw new UnauthorizedException('Banking API authentication failed');
    }
  }
}
