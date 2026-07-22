import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../auth/entities/user.entity';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface ExpoPushResponse {
  data: Array<{
    status: 'ok' | 'error';
    message?: string;
  }>;
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

    const token = user.fcm_token;
    if (!token) {
      this.logger.warn(`User ${userId} has no push token`);
      return;
    }

    this.logger.log(
      `[PUSH] To ${userId}: "${payload.title}" - "${payload.body}"`,
    );

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          sound: 'default',
        }),
      });

      if (res.ok) {
        const result: ExpoPushResponse = await res.json();
        const first = result.data?.[0];
        if (first?.status === 'error') {
          this.logger.warn(`Expo push error for user ${userId}: ${first.message}`);
        }
      } else {
        this.logger.warn(`Expo push HTTP ${res.status} for user ${userId}`);
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

  async sendAuctionStarted(productName: string, auctionId: string): Promise<void> {
    this.logger.log(`[AUCTION STARTED] ${productName}`);
  }

  async sendAuctionEndingSoon(userIds: string[], auctionId: string, productName: string): Promise<void> {
    const payload = {
      title: 'Auction Ending Soon',
      body: `${productName} auction ends in 5 minutes! Place your bid now.`,
      data: { auction_id: auctionId, type: 'ending_soon' },
    };
    await Promise.allSettled(userIds.map((uid) => this.sendPush(uid, payload)));
  }

  async sendYouWon(userId: string, auctionId: string, productName: string, paymentDeadline?: string): Promise<void> {
    const deadlineText = paymentDeadline
      ? ` Payment due by ${new Date(paymentDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}.`
      : '';
    await this.sendPush(userId, {
      title: 'You Won!',
      body: `Congratulations! You won the ${productName} auction.${deadlineText}`,
      data: { auction_id: auctionId, type: 'won', payment_deadline: paymentDeadline || '' },
    });
  }

  async sendToRole(role: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    const users = await this.userRepository.find({ where: { role } as any, select: ['id'] });
    const payload: PushPayload = { title, body, data: data || {} };
    await Promise.allSettled(users.map((u) => this.sendPush(u.id, payload)));
  }
}
