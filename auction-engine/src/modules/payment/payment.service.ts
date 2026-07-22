import * as crypto from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository, LessThan, IsNull, Not } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Auction, AuctionStatus as AS, PaymentStatus } from '../winner/entities/auction.entity';
import { Bid } from '../bidding/entities/bid.entity';
import { WinnerService } from '../winner/winner.service';
import { SikinaService } from './sikina.service';
import { PaymentTransaction, PaymentTransactionStatus, PaymentType } from './entities/payment-transaction.entity';

const PAYMENT_DEADLINE_HOURS = 24;

function cryptoRandom(): string {
  return crypto.randomBytes(8).toString('hex');
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly successRedirectUrl: string;
  private readonly failedRedirectUrl: string;

  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(Bid)
    private bidRepository: Repository<Bid>,
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepository: Repository<PaymentTransaction>,
    private winnerService: WinnerService,
    private sikinaService: SikinaService,
    private configService: ConfigService,
  ) {
    this.successRedirectUrl = this.configService.get<string>('app.sikinaSuccessRedirectUrl')!
      || `${this.configService.get<string>('app.appBaseUrl')!}/payment/success`;
    this.failedRedirectUrl = this.configService.get<string>('app.sikinaFailedRedirectUrl')!
      || `${this.configService.get<string>('app.appBaseUrl')!}/payment/failed`;
  }

  async createPaymentLink(
    auctionId: string,
    userId: string,
    amount: number,
    description: string,
  ): Promise<{ paymentUrl: string; transactionId: string }> {
    // Generate shorter clientReferenceId (max ~30 chars) to avoid SikinaPay 500 errors
    const shortAuctionId = auctionId.split('-')[0]; // First 8 chars of UUID
    const clientReferenceId = `pay-${shortAuctionId}-${Date.now()}`;

    const existing = await this.paymentTransactionRepository.findOne({
      where: { auction_id: auctionId, user_id: userId, status: PaymentTransactionStatus.PENDING },
    });
    if (existing?.sikina_payment_url) {
      return { paymentUrl: existing.sikina_payment_url, transactionId: existing.id };
    }

    // Only send redirect URLs if they're HTTPS (SikinaPay requirement)
    const sikinaParams: any = {
      amount,
      clientReferenceId,
      description,
      language: 'en',
    };
    
    if (this.successRedirectUrl?.startsWith('https://')) {
      sikinaParams.paymentSuccessfulRedirectUrl = this.successRedirectUrl;
    }
    if (this.failedRedirectUrl?.startsWith('https://')) {
      sikinaParams.paymentFailedRedirectUrl = this.failedRedirectUrl;
    }

    const sikinaResponse = await this.sikinaService.generatePaymentLink(sikinaParams);

    const transaction = this.paymentTransactionRepository.create({
      auction_id: auctionId,
      user_id: userId,
      amount,
      client_reference_id: clientReferenceId,
      sikina_payment_url: sikinaResponse.paymentUrl,
      status: PaymentTransactionStatus.PENDING,
      currency: 'ETB',
    });
    const saved = await this.paymentTransactionRepository.save(transaction);

    this.logger.log(`Payment link created for auction ${auctionId}, user ${userId}: ${sikinaResponse.paymentUrl}`);

    return { paymentUrl: sikinaResponse.paymentUrl, transactionId: saved.id };
  }

  async findTransaction(auctionId: string, userId: string): Promise<PaymentTransaction | null> {
    return this.paymentTransactionRepository.findOne({
      where: { auction_id: auctionId, user_id: userId },
      order: { created_at: 'DESC' },
    });
  }

  async createBidFeePaymentLink(
    auctionId: string,
    userId: string,
    amount: number,
  ): Promise<{ paymentUrl: string; transactionId: string }> {
    const shortAuctionId = auctionId.split('-')[0];
    const clientReferenceId = `fee-${shortAuctionId}-${userId.split('-')[0]}-${Date.now()}`;
    const description = `Bid fee for auction ${auctionId}`;

    const existing = await this.paymentTransactionRepository.findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: PaymentType.BID_FEE,
        status: PaymentTransactionStatus.PENDING,
      },
    });
    if (existing?.sikina_payment_url) {
      return { paymentUrl: existing.sikina_payment_url, transactionId: existing.id };
    }

    const sikinaParams: any = {
      amount,
      clientReferenceId,
      description,
      language: 'en',
    };

    if (this.successRedirectUrl?.startsWith('https://')) {
      sikinaParams.paymentSuccessfulRedirectUrl = this.successRedirectUrl;
    }
    if (this.failedRedirectUrl?.startsWith('https://')) {
      sikinaParams.paymentFailedRedirectUrl = this.failedRedirectUrl;
    }

    const sikinaResponse = await this.sikinaService.generatePaymentLink(sikinaParams);

    const transaction = this.paymentTransactionRepository.create({
      auction_id: auctionId,
      user_id: userId,
      amount,
      client_reference_id: clientReferenceId,
      sikina_payment_url: sikinaResponse.paymentUrl,
      status: PaymentTransactionStatus.PENDING,
      currency: 'ETB',
      payment_type: PaymentType.BID_FEE,
    });
    const saved = await this.paymentTransactionRepository.save(transaction);

    this.logger.log(`Bid fee payment link created for auction ${auctionId}, user ${userId}: ${sikinaResponse.paymentUrl}`);

    return { paymentUrl: sikinaResponse.paymentUrl, transactionId: saved.id };
  }

  async getBidFeePaymentStatus(auctionId: string, userId: string): Promise<{ status: string; payment_url: string | null }> {
    const transaction = await this.paymentTransactionRepository.findOne({
      where: {
        auction_id: auctionId,
        user_id: userId,
        payment_type: PaymentType.BID_FEE,
      },
      order: { created_at: 'DESC' },
    });

    return {
      status: transaction?.status || 'NONE',
      payment_url: transaction?.sikina_payment_url || null,
    };
  }

  async markAsPaid(auctionId: string): Promise<void> {
    const auction = await this.auctionRepository.findOne({ where: { id: auctionId } });
    if (!auction) throw new Error('Auction not found');
    if (auction.status !== AS.CLOSED || auction.payment_status !== PaymentStatus.PENDING) {
      throw new Error('Auction is not eligible for payment');
    }
    auction.payment_status = PaymentStatus.PAID;
    await this.auctionRepository.save(auction);
    this.logger.log(`Auction ${auctionId}: Payment completed by winner ${auction.winner_user_id}`);
  }

  async handleSuccessfulPayment(
    clientReferenceId: string,
    paymentReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    const transaction = await this.paymentTransactionRepository.findOne({
      where: { client_reference_id: clientReferenceId },
    });
    if (!transaction) {
      this.logger.warn(`Transaction not found for clientReferenceId: ${clientReferenceId}`);
      return;
    }
    if (transaction.status === PaymentTransactionStatus.SUCCESSFUL) {
      this.logger.debug(`Transaction ${transaction.id} already successful, skipping`);
      return;
    }

    transaction.status = PaymentTransactionStatus.SUCCESSFUL;
    transaction.sikina_payment_reference_id = paymentReferenceId;
    transaction.webhook_payload = webhookPayload;
    await this.paymentTransactionRepository.save(transaction);

    // Only mark auction as paid for WINNING_BID payments, not BID_FEE
    if (transaction.payment_type === PaymentType.WINNING_BID) {
      await this.markAsPaid(transaction.auction_id);
    } else {
      this.logger.log(`Bid fee payment completed for auction ${transaction.auction_id}, user ${transaction.user_id}`);
    }
  }

  async handleFailedPayment(
    clientReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    await this.paymentTransactionRepository.update(
      { client_reference_id: clientReferenceId },
      { status: PaymentTransactionStatus.FAILED, webhook_payload: webhookPayload },
    );
  }

  async handleExpiredPaymentLink(
    clientReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    await this.paymentTransactionRepository.update(
      { client_reference_id: clientReferenceId },
      { status: PaymentTransactionStatus.EXPIRED, webhook_payload: webhookPayload },
    );
  }

  async handleCancelledPayment(
    clientReferenceId: string,
    webhookPayload: Record<string, any>,
  ): Promise<void> {
    await this.paymentTransactionRepository.update(
      { client_reference_id: clientReferenceId },
      { status: PaymentTransactionStatus.CANCELLED, webhook_payload: webhookPayload },
    );
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async expireOverduePayments(): Promise<void> {
    const now = new Date();
    const overdue = await this.auctionRepository.find({
      where: {
        status: AS.CLOSED,
        payment_status: PaymentStatus.PENDING,
        payment_deadline: LessThan(now),
        winner_user_id: Not(IsNull()),
      },
      relations: ['product'],
      take: 50,
    });

    for (const auction of overdue) {
      try {
        await this.handleExpiredPayment(auction);
      } catch (e) {
        this.logger.error(`Failed to handle expired payment for auction ${auction.id}: ${e.message}`);
      }
    }
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async reconcilePendingPayments(): Promise<void> {
    const pendingTransactions = await this.paymentTransactionRepository.find({
      where: { status: PaymentTransactionStatus.PENDING },
      take: 100,
    });

    if (pendingTransactions.length === 0) return;

    this.logger.log(`Reconciling ${pendingTransactions.length} pending payments with SikinaPay`);

    for (const txn of pendingTransactions) {
      try {
        const transactionDate = txn.created_at.toISOString().split('T')[0];
        const status = await this.sikinaService.getPaymentStatus(
          txn.client_reference_id,
          transactionDate,
        );

        if (status === 'SUCCESSFUL') {
          this.logger.log(`Reconciliation: payment ${txn.client_reference_id} is SUCCESSFUL`);
          await this.handleSuccessfulPayment(txn.client_reference_id, '', {});
        } else if (['FAILED', 'EXPIRED', 'CANCELLED', 'REVOKED'].includes(status)) {
          this.logger.log(`Reconciliation: payment ${txn.client_reference_id} is ${status}`);
          await this.paymentTransactionRepository.update(
            { id: txn.id },
            { status: status as PaymentTransactionStatus },
          );
        }
      } catch (error) {
        this.logger.warn(`Reconciliation failed for transaction ${txn.id}: ${error.message}`);
        await this.paymentTransactionRepository.increment(
          { id: txn.id },
          'retry_count',
          1,
        );
      }
    }
  }

  private async handleExpiredPayment(auction: Auction): Promise<void> {
    this.logger.log(`Auction ${auction.id}: Payment deadline passed for winner ${auction.winner_user_id}`);

    const allBids = await this.bidRepository.find({
      where: { auction_id: auction.id },
      order: { bid_time: 'ASC' },
    });

    const losingUniqueBids = this.findNextUniqueBids(allBids, auction.winner_user_id);
    const nextWinnerBid = losingUniqueBids[0] || null;

    if (nextWinnerBid) {
      auction.winner_user_id = nextWinnerBid.user_id;
      auction.winning_bid_amount = nextWinnerBid.amount;
      auction.payment_status = PaymentStatus.PENDING;
      auction.payment_deadline = new Date(Date.now() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000);
      await this.auctionRepository.save(auction);
      this.logger.log(`Auction ${auction.id}: Payment expired, new winner ${nextWinnerBid.user_id} with bid ${nextWinnerBid.amount}`);
      this.notifyNewWinner(auction.id, nextWinnerBid.user_id).catch(() => {});
    } else {
      auction.payment_status = PaymentStatus.EXPIRED;
      auction.status = AS.EXPIRED;
      await this.auctionRepository.save(auction);
      this.logger.log(`Auction ${auction.id}: Payment expired, no more unique bidders, auction expired`);
    }
  }

  private findNextUniqueBids(allBids: Bid[], excludeUserId: string): Bid[] {
    const freq: Record<number, Bid[]> = {};
    for (const bid of allBids) {
      if (!freq[bid.amount]) freq[bid.amount] = [];
      freq[bid.amount].push(bid);
    }
    const uniqueBids = allBids.filter(
      (b) => freq[b.amount].length === 1 && b.user_id !== excludeUserId,
    );
    uniqueBids.sort((a, b) => a.amount - b.amount);
    return uniqueBids;
  }

  private async notifyNewWinner(auctionId: string, userId: string): Promise<void> {
    try {
      const auction = await this.auctionRepository.findOne({
        where: { id: auctionId },
        relations: ['product'],
      });
      const productName = auction?.product?.name || auctionId;
      const deadline = auction?.payment_deadline?.toISOString();
      await fetch('http://identity-service:3000/api/v1/notify/winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          auction_id: auctionId,
          product_name: productName,
          payment_deadline: deadline,
        }),
      });
    } catch (e) {
      this.logger.warn(`Failed to notify new winner: ${e.message}`);
    }
  }
}
