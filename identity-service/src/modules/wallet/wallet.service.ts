import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private prisma: PrismaService,
  ) {}

  async deposit(userId: string, amount: number, referenceId: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { wallet_balance: Number(user.wallet_balance) + amount },
      });

      await tx.transaction.create({
        data: {
          user_id: userId,
          amount,
          type: 'DEPOSIT',
          reference_id: referenceId,
        },
      });

      return updatedUser;
    });
  }

  async deductBidFee(userId: string, feeAmount: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');
      if (Number(user.wallet_balance) < feeAmount) {
        throw new BadRequestException('Insufficient wallet balance');
      }

      await tx.user.update({
        where: { id: userId },
        data: { wallet_balance: Number(user.wallet_balance) - feeAmount },
      });

      await tx.transaction.create({
        data: {
          user_id: userId,
          amount: feeAmount,
          type: 'BID_FEE',
          reference_id: null,
        },
      });
    });
  }

  async refund(userId: string, amount: number, referenceId: string): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('User not found');

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { wallet_balance: Number(user.wallet_balance) + amount },
      });

      await tx.transaction.create({
        data: {
          user_id: userId,
          amount,
          type: 'REFUND',
          reference_id: referenceId,
        },
      });

      return updatedUser;
    });
  }

  async getBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { wallet_balance: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return Number(user.wallet_balance);
  }

  async getTransactions(userId: string, page = 1, limit = 20): Promise<{ data: any[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where: { user_id: userId } }),
    ]);
    return { data, total };
  }

  async resolveUser(id: string): Promise<any | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, full_name: true, phone_number: true },
    });
  }

  async handleFintechWebhook(payload: {
    reference_id: string;
    user_id: string;
    amount: number;
    status: string;
  }): Promise<void> {
    if (payload.status !== 'COMPLETED') return;

    const existing = await this.prisma.transaction.findFirst({
      where: { reference_id: payload.reference_id },
    });
    if (existing) return;

    await this.deposit(payload.user_id, payload.amount, payload.reference_id);
  }
}