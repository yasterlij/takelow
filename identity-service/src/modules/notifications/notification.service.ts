import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../auth/entities/user.entity';
import { NotificationLog, NotificationChannel } from './entities/notification-log.entity';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const SMSETHIOPIA_URL = 'https://smsethiopia.com/api/sms/send';

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

export interface WinnerNotificationPayload {
  user_id: string;
  auction_id: string;
  product_name: string;
  product_description?: string;
  winning_amount: number;
  payment_deadline: string;
  collection_location?: string;
  collection_method?: string;
  collection_instructions?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(NotificationLog)
    private notificationLogRepository: Repository<NotificationLog>,
    private configService: ConfigService,
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

    this.logger.log(`[PUSH] To ${userId}: "${payload.title}" - "${payload.body}"`);

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

  async sendSms(phone: string, text: string): Promise<void> {
    const apiKey = this.configService.get<string>('app.smsApiKey');
    if (!apiKey) {
      this.logger.warn('SMS_API_KEY not configured, skipping SMS');
      return;
    }
    const msisdn = phone.startsWith('0') ? `251${phone.slice(1)}` : phone.startsWith('251') ? phone : `251${phone}`;
    try {
      const res = await fetch(SMSETHIOPIA_URL, {
        method: 'POST',
        headers: { KEY: apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ msisdn, text }),
      });
      if (res.ok) {
        this.logger.log(`[SMS] Sent to ${msisdn}: "${text.slice(0, 50)}..."`);
      } else {
        const body = await res.text();
        this.logger.warn(`[SMS] Failed (${res.status}): ${body}`);
      }
    } catch (error) {
      this.logger.error(`[SMS] Error sending to ${msisdn}: ${error.message}`);
    }
  }

  async persistNotification(log: Partial<NotificationLog>): Promise<NotificationLog> {
    return this.notificationLogRepository.save(
      this.notificationLogRepository.create(log),
    );
  }

  async sendWinnerNotification(payload: WinnerNotificationPayload): Promise<void> {
    const deadlineDate = new Date(payload.payment_deadline);
    const deadlineFormatted = deadlineDate.toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    const pushTitle = 'You Won!';
    const pushBody = `Congratulations! You won the ${payload.product_name} auction with a unique bid of ETB ${payload.winning_amount.toFixed(2)}. Payment due by ${deadlineFormatted}.`;

    await this.sendPush(payload.user_id, {
      title: pushTitle,
      body: pushBody,
      data: {
        auction_id: payload.auction_id,
        type: 'won',
        winning_amount: String(payload.winning_amount),
        payment_deadline: payload.payment_deadline,
      },
    });

    const inAppBody = [
      `Congratulations! You won the "${payload.product_name}" auction.`,
      `Your unique winning bid: ETB ${payload.winning_amount.toFixed(2)}`,
      `Payment deadline: ${deadlineFormatted}`,
    ];
    if (payload.product_description) {
      inAppBody.push(`Item: ${payload.product_description}`);
    }
    if (payload.collection_location) {
      inAppBody.push(`Collection: ${payload.collection_location}`);
    }
    if (payload.collection_instructions) {
      inAppBody.push(`Instructions: ${payload.collection_instructions}`);
    }

    const metadata: Record<string, any> = {
      auction_id: payload.auction_id,
      winning_amount: payload.winning_amount,
      payment_deadline: payload.payment_deadline,
      product_name: payload.product_name,
    };
    if (payload.collection_location) metadata.collection_location = payload.collection_location;
    if (payload.collection_method) metadata.collection_method = payload.collection_method;
    if (payload.collection_instructions) metadata.collection_instructions = payload.collection_instructions;

    await this.persistNotification({
      user_id: payload.user_id,
      auction_id: payload.auction_id,
      type: 'winner',
      channel: NotificationChannel.INAPP,
      title: pushTitle,
      body: inAppBody.join('\n'),
      metadata,
    });

    this.logger.log(`Winner notification sent to user ${payload.user_id} for auction ${payload.auction_id}, amount ETB ${payload.winning_amount}`);
  }

  async getInAppNotifications(userId: string, unreadOnly = false): Promise<NotificationLog[]> {
    const where: any = { user_id: userId, channel: NotificationChannel.INAPP };
    if (unreadOnly) where.read = false;
    return this.notificationLogRepository.find({
      where,
      order: { sent_at: 'DESC' },
      take: 50,
    });
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    await this.notificationLogRepository.update({ id: notificationId }, { read: true });
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await this.notificationLogRepository.update(
      { user_id: userId, channel: NotificationChannel.INAPP, read: false },
      { read: true },
    );
  }

  async sendOutbidAlert(userId: string, auctionId: string, bidAmount: number): Promise<void> {
    await this.sendPush(userId, {
      title: 'Outbid Alert',
      body: `Someone just bid ${bidAmount} ETB. Check the app!`,
      data: { auction_id: auctionId, type: 'outbid' },
    });
    await this.persistNotification({
      user_id: userId,
      auction_id: auctionId,
      type: 'outbid',
      channel: NotificationChannel.INAPP,
      title: 'Outbid Alert',
      body: `Someone just bid ${bidAmount.toFixed(2)} ETB. Check the app!`,
      metadata: { auction_id: auctionId, bid_amount: bidAmount },
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
    for (const uid of userIds) {
      await this.persistNotification({
        user_id: uid,
        auction_id: auctionId,
        type: 'ending_soon',
        channel: NotificationChannel.INAPP,
        title: payload.title,
        body: payload.body,
        metadata: { auction_id: auctionId, product_name: productName },
      });
    }
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
