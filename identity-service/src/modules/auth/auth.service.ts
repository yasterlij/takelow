import {
  Injectable,
  BadRequestException,
  ConflictException,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, AuthProvider } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { SuperAppRegistry } from './adapters/super-app-registry';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private superAppRegistry: SuperAppRegistry,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: User; access_token: string; refresh_token: string }> {
    const existing = dto.phone_number
      ? await this.userRepository.findOne({ where: { phone_number: dto.phone_number } })
      : dto.email
        ? await this.userRepository.findOne({ where: { email: dto.email } })
        : null;

    if (existing) {
      throw new ConflictException('User already exists');
    }

    const user = new User();
    user.phone_number = dto.phone_number || null as any;
    user.email = dto.email || null as any;
    user.full_name = dto.full_name || null as any;

    if (dto.password) {
      user.password_hash = await bcrypt.hash(dto.password, 12);
      user.auth_provider = AuthProvider.LOCAL;
    } else if (dto.provider) {
      user.auth_provider = AuthProvider.SUPER_APP;
      user.provider_id = dto.provider_id!;
    }

    const saved = await this.userRepository.save(user);
    const tokens = await this.generateTokens(saved);

    saved.hashed_refresh_token = await bcrypt.hash(tokens.refresh_token, 12);
    await this.userRepository.save(saved);

    return { user: saved, ...tokens };
  }

  async validateLocalUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user || !user.password_hash) {
      return null;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    return valid ? user : null;
  }

  async validateLocalUserByPhone(phone: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { phone_number: phone } });
    if (!user || !user.password_hash) return null;
    return (await bcrypt.compare(password, user.password_hash)) ? user : null;
  }

  async validateTeleBirrUser(accessToken: string, phoneNumber: string): Promise<User> {
    let user = await this.userRepository.findOne({ where: { phone_number: phoneNumber } });

    if (!user) {
      user = this.userRepository.create({
        phone_number: phoneNumber,
        auth_provider: AuthProvider.TELEBIRR,
        provider_id: accessToken,
      });
      user = await this.userRepository.save(user);
    }

    return user;
  }

  async validateBankingUser(apiToken: string, bankAccount?: string): Promise<User> {
    let user = bankAccount
      ? await this.userRepository.findOne({ where: { phone_number: bankAccount } })
      : null;

    if (!user) {
      user = this.userRepository.create({
        phone_number: bankAccount || `bank_${Date.now()}`,
        auth_provider: AuthProvider.BANKING_API,
        provider_id: apiToken,
      });
      user = await this.userRepository.save(user);
    }

    return user;
  }

  async validateSuperAppUser(
    provider: string,
    code: string,
    redirectUri: string,
  ): Promise<User> {
    const adapter = this.superAppRegistry.get(provider);
    const accessToken = await adapter.exchangeCode(code, redirectUri);
    const superAppUser = await adapter.getUserInfo(accessToken);

    let user = superAppUser.phone_number
      ? await this.userRepository.findOne({ where: { phone_number: superAppUser.phone_number } })
      : superAppUser.email
        ? await this.userRepository.findOne({ where: { email: superAppUser.email } })
        : null;

    if (!user) {
      user = this.userRepository.create({
        phone_number: superAppUser.phone_number,
        email: superAppUser.email,
        full_name: superAppUser.full_name,
        avatar_url: superAppUser.avatar_url,
        auth_provider: AuthProvider.SUPER_APP,
        provider_id: superAppUser.id,
      });
      user = await this.userRepository.save(user);
    }

    return user;
  }

  async login(user: User): Promise<{ access_token: string; refresh_token: string; user: { id: string; role: string; phone_number: string } }> {
    const tokens = await this.generateTokens(user);
    user.hashed_refresh_token = await bcrypt.hash(tokens.refresh_token, 12);
    await this.userRepository.save(user);
    return {
      ...tokens,
      user: { id: user.id, role: user.role, phone_number: user.phone_number },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string; user: { id: string; role: string; phone_number: string } }> {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('app.jwtRefreshSecret'),
      });
    } catch {
      throw new BadRequestException('Invalid refresh token');
    }

    const user = await this.userRepository.findOne({ where: { id: payload.sub } });
    if (!user || !user.hashed_refresh_token) {
      throw new BadRequestException('User not found or refresh token not set');
    }

    const isValid = await bcrypt.compare(refreshToken, user.hashed_refresh_token);
    if (!isValid) {
      throw new BadRequestException('Refresh token mismatch');
    }

    const tokens = await this.generateTokens(user);
    user.hashed_refresh_token = await bcrypt.hash(tokens.refresh_token, 12);
    await this.userRepository.save(user);

    return {
      ...tokens,
      user: { id: user.id, role: user.role, phone_number: user.phone_number },
    };
  }

  private readonly logger = new Logger(AuthService.name);

  async getProfile(userId: string) {
    return this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'phone_number',
        'email',
        'full_name',
        'avatar_url',
        'role',
        'wallet_balance',
        'phone_verified',
        'auth_provider',
        'created_at',
      ],
    });
  }

  async updateProfile(userId: string, data: { full_name?: string; email?: string }) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    const update: Partial<User> = {};
    if (data.full_name !== undefined) update.full_name = data.full_name;
    if (data.email !== undefined) update.email = data.email;
    if (Object.keys(update).length > 0) {
      await this.userRepository.update(userId, update);
    }
    return this.getProfile(userId);
  }

  async logFailedLogin(identifier: string, actorId: string, reason: string): Promise<void> {
    this.logger.warn(`Failed login attempt for ${identifier}, reason: ${reason}`);
    try {
      const internalApiKey = this.configService.get<string>('app.internalApiKey');
      if (!internalApiKey) return;
      await fetch('http://localhost:3000/api/v1/admin/audit/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': internalApiKey,
        },
        body: JSON.stringify({
          actor_id: actorId,
          actor_phone: identifier,
          action: 'LOGIN_FAILED',
          entity_type: 'user',
          entity_id: actorId,
          details: { reason, timestamp: new Date().toISOString() },
        }),
      });
    } catch (e) {
      this.logger.warn(`Failed to log login attempt: ${e.message}`);
    }
  }

  async registerPushToken(
    userId: string,
    token: string,
    platform: 'android' | 'ios',
  ): Promise<void> {
    const updateField =
      platform === 'android' ? { fcm_token: token } : { apns_token: token };
    await this.userRepository.update(userId, updateField);
  }

  private async generateTokens(
    user: User,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const payload = { sub: user.id, phone: user.phone_number, role: user.role, wallet_balance: user.wallet_balance };

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
}
