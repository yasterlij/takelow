import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { SuperAppRegistry } from './adapters/super-app-registry';
import { AuthTokenService } from './auth-token.service';
import { AuthAuditService } from './auth-audit.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private superAppRegistry: SuperAppRegistry,
    private authTokenService: AuthTokenService,
    private authAuditService: AuthAuditService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: any; access_token: string; refresh_token: string }> {
    const existing = dto.phone_number
      ? await this.prisma.user.findFirst({ where: { phone_number: dto.phone_number } })
      : dto.email
        ? await this.prisma.user.findFirst({ where: { email: dto.email } })
        : null;

    if (existing) {
      throw new ConflictException('User already exists');
    }

    const saved = await this.prisma.user.create({
      data: {
        phone_number: dto.phone_number || null,
        email: dto.email || null,
        full_name: dto.full_name || null,
        password_hash: await bcrypt.hash(dto.password, 12),
        auth_provider: 'LOCAL',
      },
    });

    const tokens = await this.authTokenService.generateTokens(saved);

    await this.prisma.user.update({
      where: { id: saved.id },
      data: { hashed_refresh_token: await bcrypt.hash(tokens.refresh_token, 12) },
    });

    const sanitizedUser = {
      id: saved.id,
      role: saved.role,
      phone_number: saved.phone_number || '',
      email: saved.email || '',
      full_name: saved.full_name || '',
    };

    return { user: sanitizedUser, ...tokens };
  }

  async validateLocalUser(email: string, password: string): Promise<any | null> {
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user || !user.password_hash) {
      return null;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    return valid ? user : null;
  }

  async validateLocalUserByPhone(phone: string, password: string): Promise<any | null> {
    const user = await this.prisma.user.findFirst({ where: { phone_number: phone } });
    if (!user || !user.password_hash) return null;
    return (await bcrypt.compare(password, user.password_hash)) ? user : null;
  }

  async validateTeleBirrUser(accessToken: string, phoneNumber: string): Promise<any> {
    let user = await this.prisma.user.findFirst({ where: { phone_number: phoneNumber } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone_number: phoneNumber,
          auth_provider: 'TELEBIRR',
          provider_id: accessToken,
        },
      });
    }

    return user;
  }

  async validateBankingUser(apiToken: string, bankAccount?: string): Promise<any> {
    let user = bankAccount
      ? await this.prisma.user.findFirst({ where: { phone_number: bankAccount } })
      : null;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone_number: bankAccount || `bank_${Date.now()}`,
          auth_provider: 'BANKING_API',
          provider_id: apiToken,
        },
      });
    }

    return user;
  }

  async validateSuperAppUser(
    provider: string,
    code: string,
    redirectUri: string,
  ): Promise<any> {
    const adapter = this.superAppRegistry.get(provider);
    const accessToken = await adapter.exchangeCode(code, redirectUri);
    const superAppUser = await adapter.getUserInfo(accessToken);

    let user = superAppUser.phone_number
      ? await this.prisma.user.findFirst({ where: { phone_number: superAppUser.phone_number } })
      : superAppUser.email
        ? await this.prisma.user.findFirst({ where: { email: superAppUser.email } })
        : null;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phone_number: superAppUser.phone_number,
          email: superAppUser.email,
          full_name: superAppUser.full_name,
          avatar_url: superAppUser.avatar_url,
          auth_provider: 'SUPER_APP',
          provider_id: superAppUser.id,
        },
      });
    }

    return user;
  }

  async login(user: any): Promise<{ access_token: string; refresh_token: string; user: { id: string; role: string; phone_number: string } }> {
    const tokens = await this.authTokenService.generateTokens(user);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashed_refresh_token: await bcrypt.hash(tokens.refresh_token, 12) },
    });
    return {
      ...tokens,
      user: { id: user.id, role: user.role, phone_number: user.phone_number || '' },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; user: { id: string; role: string; phone_number: string } }> {
    let payload: any;
    try {
      payload = this.authTokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new BadRequestException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.hashed_refresh_token) {
      throw new BadRequestException('User not found or refresh token not set');
    }

    const isValid = await bcrypt.compare(refreshToken, user.hashed_refresh_token);
    if (!isValid) {
      throw new BadRequestException('Refresh token mismatch');
    }

    const tokens = await this.authTokenService.generateTokens(user);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { hashed_refresh_token: await bcrypt.hash(tokens.refresh_token, 12) },
    });

    return {
      ...tokens,
      user: { id: user.id, role: user.role, phone_number: user.phone_number || '' },
    };
  }

  async logout(userId: string): Promise<{ logged_out: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return { logged_out: true };
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashed_refresh_token: '' },
    });
    return { logged_out: true };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone_number: true,
        email: true,
        full_name: true,
        avatar_url: true,
        role: true,
        wallet_balance: true,
        phone_verified: true,
        auth_provider: true,
        created_at: true,
      },
    });
  }

  async updateProfile(userId: string, data: { full_name?: string; email?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    const update: any = {};
    if (data.full_name !== undefined) update.full_name = data.full_name;
    if (data.email !== undefined) update.email = data.email;
    if (Object.keys(update).length > 0) {
      await this.prisma.user.update({ where: { id: userId }, data: update });
    }
    return this.getProfile(userId);
  }

  async logFailedLogin(identifier: string, actorId: string, reason: string): Promise<void> {
    await this.authAuditService.logFailedLogin(identifier, actorId, reason);
  }

  async registerPushToken(
    userId: string,
    token: string,
    platform: 'android' | 'ios',
  ): Promise<void> {
    const updateField =
      platform === 'android' ? { fcm_token: token } : { apns_token: token };
    await this.prisma.user.update({ where: { id: userId }, data: updateField });
  }
}