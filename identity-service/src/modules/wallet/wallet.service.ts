import { Injectable, BadRequestException, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../auth/entities/user.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private dataSource: DataSource,
  ) {}

  async deposit(userId: string, amount: number, referenceId: string): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.wallet_balance = Number(user.wallet_balance) + amount;
      await queryRunner.manager.save(user);

      const transaction = queryRunner.manager.create(Transaction, {
        user_id: userId,
        amount,
        type: TransactionType.DEPOSIT,
        reference_id: referenceId,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
      return user;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deductBidFee(userId: string, feeAmount: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (Number(user.wallet_balance) < feeAmount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      user.wallet_balance = Number(user.wallet_balance) - feeAmount;
      await queryRunner.manager.save(user);

      const transaction = queryRunner.manager.create(Transaction, {
        user_id: userId,
        amount: feeAmount,
        type: TransactionType.BID_FEE,
        reference_id: null as any,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async refund(userId: string, amount: number, referenceId: string): Promise<User> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      user.wallet_balance = Number(user.wallet_balance) + amount;
      await queryRunner.manager.save(user);

      const transaction = queryRunner.manager.create(Transaction, {
        user_id: userId,
        amount,
        type: TransactionType.REFUND,
        reference_id: referenceId,
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
      return user;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getBalance(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['wallet_balance'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return Number(user.wallet_balance);
  }

  async getTransactions(userId: string, page = 1, limit = 20): Promise<{ data: Transaction[]; total: number }> {
    const [data, total] = await this.transactionRepository.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async resolveUser(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      select: ['id', 'full_name', 'phone_number'],
    });
  }

  async setPin(userId: string, pin: string): Promise<void> {
    if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      throw new BadRequestException('PIN must be 4–6 digits');
    }
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    user.wallet_pin_hash = await bcrypt.hash(pin, 10);
    await this.userRepository.save(user);
  }

  private readonly MAX_PIN_ATTEMPTS = 5;
  private readonly PIN_LOCKOUT_MINUTES = 30;

  async verifyPin(userId: string, pin: string): Promise<{ valid: boolean; attemptsRemaining: number; locked: boolean; lockedUntil: Date | null }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'wallet_pin_hash', 'pin_attempts', 'pin_locked_until'],
    });
    if (!user) throw new NotFoundException('User not found');
    if (!user.wallet_pin_hash) {
      throw new BadRequestException('Wallet PIN not set');
    }

    // Check if currently locked
    if (user.pin_locked_until && user.pin_locked_until > new Date()) {
      return { valid: false, attemptsRemaining: 0, locked: true, lockedUntil: user.pin_locked_until };
    }

    // If lock expired, reset atomically
    if (user.pin_locked_until && user.pin_locked_until <= new Date()) {
      await this.userRepository.update(user.id, { pin_attempts: 0, pin_locked_until: null as any });
      user.pin_attempts = 0;
    }

    const valid = await bcrypt.compare(pin, user.wallet_pin_hash);

    if (!valid) {
      // Atomic increment prevents the race where concurrent verify calls
      // both read the same pin_attempts and overwrite each other.
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

    // Success — reset attempts atomically
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

  async handleFintechWebhook(payload: {
    reference_id: string;
    user_id: string;
    amount: number;
    status: string;
  }): Promise<void> {
    if (payload.status !== 'COMPLETED') {
      return;
    }

    const existing = await this.transactionRepository.findOne({
      where: { reference_id: payload.reference_id },
    });
    if (existing) {
      return;
    }

    await this.deposit(payload.user_id, payload.amount, payload.reference_id);
  }
}
