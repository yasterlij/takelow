import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WalletPinService {
  private readonly MAX_PIN_ATTEMPTS = 5;
  private readonly PIN_LOCKOUT_MINUTES = 5;

  constructor(
    private prisma: PrismaService,
  ) {}

  async setPin(userId: string, pin: string): Promise<void> {
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      throw new BadRequestException('PIN must be 4–6 digits');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    await this.prisma.user.update({
      where: { id: userId },
      data: { wallet_pin_hash: await bcrypt.hash(pin, 10) },
    });
  }

  async verifyPin(userId: string, pin: string): Promise<{ valid: boolean; attemptsRemaining: number; locked: boolean; lockedUntil: Date | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, wallet_pin_hash: true, pin_attempts: true, pin_locked_until: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.wallet_pin_hash) {
      throw new BadRequestException('Wallet PIN not set');
    }

    if (user.pin_locked_until && user.pin_locked_until > new Date()) {
      return { valid: false, attemptsRemaining: 0, locked: true, lockedUntil: user.pin_locked_until };
    }

    if (user.pin_locked_until && user.pin_locked_until <= new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { pin_attempts: 0, pin_locked_until: null },
      });
      user.pin_attempts = 0;
    }

    const valid = await bcrypt.compare(pin, user.wallet_pin_hash);

    if (!valid) {
      const newAttempts = (user.pin_attempts || 0) + 1;
      const locked = newAttempts >= this.MAX_PIN_ATTEMPTS;
      const lockedUntil = locked ? new Date(Date.now() + this.PIN_LOCKOUT_MINUTES * 60 * 1000) : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          pin_attempts: newAttempts,
          ...(locked ? { pin_locked_until: lockedUntil } : {}),
        },
      });

      const attemptsRemaining = locked ? 0 : Math.max(0, this.MAX_PIN_ATTEMPTS - newAttempts);
      return { valid: false, attemptsRemaining, locked, lockedUntil };
    }

    if ((user.pin_attempts || 0) > 0 || user.pin_locked_until) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { pin_attempts: 0, pin_locked_until: null },
      });
    }

    return { valid: true, attemptsRemaining: this.MAX_PIN_ATTEMPTS, locked: false, lockedUntil: null };
  }

  async getPinStatus(userId: string): Promise<{ hasPin: boolean; attemptsRemaining: number; locked: boolean; lockedUntil: Date | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, wallet_pin_hash: true, pin_attempts: true, pin_locked_until: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const locked = !!(user.pin_locked_until && user.pin_locked_until > new Date());
    const attemptsRemaining = Math.max(0, this.MAX_PIN_ATTEMPTS - (user.pin_attempts || 0));

    return {
      hasPin: user.wallet_pin_hash !== null,
      attemptsRemaining: locked ? 0 : attemptsRemaining,
      locked,
      lockedUntil: locked ? user.pin_locked_until : null,
    };
  }

  async hasPin(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, wallet_pin_hash: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user.wallet_pin_hash !== null;
  }
}