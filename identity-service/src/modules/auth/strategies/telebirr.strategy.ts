import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class TeleBirrStrategy extends PassportStrategy(Strategy, 'telebirr') {
  constructor(private authService: AuthService) {
    super();
  }

  async validate(req: Request): Promise<any> {
    const { access_token, phone_number } = req.body;

    if (!access_token && !phone_number) {
      throw new UnauthorizedException('TeleBirr access token or phone number required');
    }

    try {
      const user = await this.authService.validateTeleBirrUser(
        access_token,
        phone_number,
      );
      return user;
    } catch {
      throw new UnauthorizedException('TeleBirr authentication failed');
    }
  }
}
