import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WinnerManagementService {
  constructor(private prisma: PrismaService) {}

  async getWinners(auctionId: string) {
    const winners = await this.prisma.winner.findMany({
      where: { auction_id: auctionId },
      include: {
        user: {
          select: {
            id: true,
            phone_number: true,
            full_name: true,
            email: true,
          },
        },
        auction: {
          select: {
            id: true,
            public_code: true,
            payment_deadline: true,
            payment_status: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { rank: 'asc' },
    });

    const paymentTransactions = await this.prisma.paymentTransaction.findMany({
      where: {
        auction_id: auctionId,
        payment_type: 'WINNING_BID',
      },
      select: {
        user_id: true,
        status: true,
        amount: true,
        created_at: true,
        updated_at: true,
        gateway: true,
      },
    });

    const paymentMap = new Map(
      paymentTransactions.map((pt) => [pt.user_id, pt]),
    );

    return winners.map((winner) => ({
      ...winner,
      amount: Number(winner.amount),
      payment_transaction: paymentMap.get(winner.user_id) || null,
    }));
  }

  async getPendingWinners() {
    const winners = await this.prisma.winner.findMany({
      where: { payment_status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            phone_number: true,
            full_name: true,
            email: true,
          },
        },
        auction: {
          select: {
            id: true,
            public_code: true,
            payment_deadline: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return winners.map((winner) => ({
      ...winner,
      amount: Number(winner.amount),
    }));
  }

  async getExpiredWinners() {
    const now = new Date();
    const winners = await this.prisma.winner.findMany({
      where: {
        payment_status: 'PENDING',
        payment_deadline: { lt: now },
      },
      include: {
        user: {
          select: {
            id: true,
            phone_number: true,
            full_name: true,
            email: true,
          },
        },
        auction: {
          select: {
            id: true,
            public_code: true,
            payment_deadline: true,
            product: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { payment_deadline: 'asc' },
    });

    return winners.map((winner) => ({
      ...winner,
      amount: Number(winner.amount),
    }));
  }

  async getWinnerStats() {
    const [
      totalWinners,
      paidWinners,
      pendingWinners,
      avgPaymentTime,
    ] = await Promise.all([
      this.prisma.winner.count(),
      this.prisma.winner.count({ where: { payment_status: 'PAID' } }),
      this.prisma.winner.count({ where: { payment_status: 'PENDING' } }),
      this.prisma.$queryRawUnsafe(
        `SELECT AVG(EXTRACT(EPOCH FROM (pt.updated_at - w.created_at)))::float AS avg_seconds
         FROM winners w
         JOIN payment_transactions pt
           ON pt.auction_id = w.auction_id
           AND pt.user_id = w.user_id
           AND pt.payment_type = 'WINNING_BID'
         WHERE pt.status = 'SUCCESSFUL'`,
      ),
    ]);

    const paidRate =
      totalWinners > 0 ? (paidWinners / totalWinners) * 100 : 0;

    return {
      total_winners: totalWinners,
      paid_winners: paidWinners,
      pending_winners: pendingWinners,
      paid_rate: Number(paidRate.toFixed(2)),
      average_payment_time_seconds: Number(
        (avgPaymentTime as any[])[0]?.avg_seconds || 0,
      ),
    };
  }

  async extendPaymentDeadline(
    winnerId: string,
    newDeadline: Date,
    adminId: string,
  ) {
    const winner = await this.prisma.winner.findUnique({
      where: { id: winnerId },
    });

    if (!winner) {
      throw new NotFoundException(`Winner with id ${winnerId} not found`);
    }

    const updated = await this.prisma.winner.update({
      where: { id: winnerId },
      data: { payment_deadline: newDeadline },
    });

    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId,
        action: 'EXTEND_PAYMENT_DEADLINE',
        entity_type: 'Winner',
        entity_id: winnerId,
        details: {
          previous_deadline: winner.payment_deadline,
          new_deadline: newDeadline,
          auction_id: winner.auction_id,
          user_id: winner.user_id,
        },
      },
    });

    return {
      ...updated,
      amount: Number(updated.amount),
    };
  }

  async confirmPayment(winnerId: string, adminId: string) {
    const winner = await this.prisma.winner.findUnique({
      where: { id: winnerId },
    });

    if (!winner) {
      throw new NotFoundException(`Winner with id ${winnerId} not found`);
    }

    const updated = await this.prisma.winner.update({
      where: { id: winnerId },
      data: { payment_status: 'PAID' },
    });

    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId,
        action: 'CONFIRM_PAYMENT',
        entity_type: 'Winner',
        entity_id: winnerId,
        details: {
          previous_status: winner.payment_status,
          new_status: 'PAID',
          auction_id: winner.auction_id,
          user_id: winner.user_id,
          amount: Number(winner.amount),
        },
      },
    });

    return {
      ...updated,
      amount: Number(updated.amount),
    };
  }

  async triggerRotation(auctionId: string, adminId: string) {
    const now = new Date();

    const expiredWinners = await this.prisma.winner.findMany({
      where: {
        auction_id: auctionId,
        payment_status: 'PENDING',
        payment_deadline: { lt: now },
      },
      orderBy: { rank: 'asc' },
    });

    const rotated = await Promise.all(
      expiredWinners.map((winner) =>
        this.prisma.winner.update({
          where: { id: winner.id },
          data: { payment_status: 'EXPIRED' },
        }),
      ),
    );

    await this.prisma.auditLog.create({
      data: {
        actor_id: adminId,
        action: 'TRIGGER_ROTATION',
        entity_type: 'Auction',
        entity_id: auctionId,
        details: {
          expired_winner_count: rotated.length,
          rotated_winner_ids: rotated.map((w) => w.id),
        },
      },
    });

    return {
      auction_id: auctionId,
      rotated_count: rotated.length,
      rotated_winners: rotated.map((w) => ({
        ...w,
        amount: Number(w.amount),
      })),
    };
  }
}
