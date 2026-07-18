import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Transaction, TransactionType } from './entities/transaction.entity';

@Injectable()
export class WalletService {
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
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return Number(user.wallet_balance);
  }

  async getTransactions(userId: string): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
    });
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
