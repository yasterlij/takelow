import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async sendPush(userId: string, payload: PushPayload): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      this.logger.warn(`User ${userId} not found for push notification`);
      return;
    }

    this.logger.log(
      `[PUSH] To ${userId}: "${payload.title}" - "${payload.body}"`,
    );

    try {
      if (process.env.NODE_ENV === 'production') {
        await this.sendFcm(user, payload);
        await this.sendApns(user, payload);
      }
    } catch (error) {
      this.logger.error(`Push failed for user ${userId}: ${error.message}`);
    }
  }

  async sendOutbidAlert(userId: string, auctionId: string, bidAmount: number): Promise<void> {
    await this.sendPush(userId, {
      title: 'Outbid Alert',
      body: `Someone just bid ${bidAmount} ETB. Check the app!`,
      data: { auction_id: auctionId, type: 'outbid' },
    });
  }

  async sendAuctionEndingSoon(userId: string, auctionId: string, productName: string): Promise<void> {
    await this.sendPush(userId, {
      title: 'Auction Ending Soon',
      body: `${productName} auction ends in 5 minutes! Place your bid now.`,
      data: { auction_id: auctionId, type: 'ending_soon' },
    });
  }

  async sendYouWon(userId: string, auctionId: string, productName: string): Promise<void> {
    await this.sendPush(userId, {
      title: 'You Won!',
      body: `Congratulations! You won the ${productName} auction.`,
      data: { auction_id: auctionId, type: 'won' },
    });
  }

  private async sendFcm(user: User, payload: PushPayload): Promise<void> {
    this.logger.debug(`[FCM] ${user.phone_number}: ${payload.title}`);
  }

  private async sendApns(user: User, payload: PushPayload): Promise<void> {
    this.logger.debug(`[APNS] ${user.phone_number}: ${payload.title}`);
  }
}
