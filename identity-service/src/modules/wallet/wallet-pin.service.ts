import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class WalletPinService {
  private readonly MAX_PIN_ATTEMPTS = 5;
  private readonly PIN_LOCKOUT_MINUTES = 5;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async setPin(userId: string, pin: string): Promise<void> {
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      throw new BadRequestException('PIN must be 4–6 digits');
    }
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.wallet_pin_hash = await bcrypt.hash(pin, 10);
    await this.userRepository.save(user);
  }

  async verifyPin(userId: string, pin: string): Promise<{ valid: boolean; attemptsRemaining: number; locked: boolean; lockedUntil: Date | null }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'wallet_pin_hash', 'pin_attempts', 'pin_locked_until'],
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.wallet_pin_hash) {
      throw new BadRequestException('Wallet PIN not set');
    }

    if (user.pin_locked_until && user.pin_locked_until > new Date()) {
      return { valid: false, attemptsRemaining: 0, locked: true, lockedUntil: user.pin_locked_until };
    }

    if (user.pin_locked_until && user.pin_locked_until <= new Date()) {
      await this.userRepository.update(user.id, { pin_attempts: 0, pin_locked_until: null as any });
      user.pin_attempts = 0;
    }

    const valid = await bcrypt.compare(pin, user.wallet_pin_hash);

    if (!valid) {
      await this.userRepository.increment({ id: userId }, 'pin_attempts', 1);
      const updated = await this.userRepository.findOne({
        where: { id: userId },
        select: ['pin_attempts', 'pin_locked_until'],
      });
      const newAttempts = updated?.pin_attempts ?? 1;
      const locked = newAttempts >= this.MAX_PIN_ATTEMPTS;
      const lockedUntil = locked ? new Date(Date.now() + this.PIN_LOCKOUT_MINUTES * 60 * 1000) : null;

      if (locked) {
        await this.userRepository.update(user.id, { pin_locked_until: lockedUntil as any });
      }

      const attemptsRemaining = locked ? 0 : Math.max(0, this.MAX_PIN_ATTEMPTS - newAttempts);
      return { valid: false, attemptsRemaining, locked, lockedUntil };
    }

    if ((user.pin_attempts || 0) > 0 || user.pin_locked_until) {
      await this.userRepository.update(user.id, { pin_attempts: 0, pin_locked_until: null as any });
    }

    return { valid: true, attemptsRemaining: this.MAX_PIN_ATTEMPTS, locked: false, lockedUntil: null };
  }

  async getPinStatus(userId: string): Promise<{ hasPin: boolean; attemptsRemaining: number; locked: boolean; lockedUntil: Date | null }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'wallet_pin_hash', 'pin_attempts', 'pin_locked_until'],
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
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'wallet_pin_hash'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user.wallet_pin_hash !== null;
  }
}