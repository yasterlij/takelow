import {
  Controller,
  Post,
  Body,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { NotificationService } from './notification.service';

@Controller('notify')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private notificationService: NotificationService) {}

  @Post('winner')
  @HttpCode(200)
  async notifyWinner(
    @Body('user_id') userId: string,
    @Body('auction_id') auctionId: string,
    @Body('product_name') productName: string,
    @Body('payment_deadline') paymentDeadline?: string,
  ) {
    if (!userId || !auctionId || !productName) {
      throw new BadRequestException('Missing required fields: user_id, auction_id, product_name');
    }
    await this.notificationService.sendYouWon(userId, auctionId, productName, paymentDeadline);
    return { notified: true };
  }

  @Post('outbid')
  @HttpCode(200)
  async notifyOutbid(
    @Body('user_id') userId: string,
    @Body('auction_id') auctionId: string,
    @Body('bid_amount') bidAmount: number,
  ) {
    if (!userId || !auctionId || !bidAmount) {
      throw new BadRequestException('Missing required fields');
    }
    await this.notificationService.sendOutbidAlert(userId, auctionId, bidAmount);
    return { notified: true };
  }

  @Post('auction-started')
  @HttpCode(200)
  async notifyAuctionStarted(
    @Body('auction_id') auctionId: string,
    @Body('product_name') productName: string,
  ) {
    if (!auctionId || !productName) {
      throw new BadRequestException('Missing required fields');
    }
    await this.notificationService.sendAuctionStarted(productName, auctionId);
    return { notified: true };
  }

  @Post('auction-extended')
  @HttpCode(200)
  async notifyAuctionExtended(
    @Body('auction_id') auctionId: string,
    @Body('current_bids') currentBids: number,
    @Body('min_bids') minBids: number,
  ) {
    if (!auctionId) throw new BadRequestException('Missing auction_id');
    await this.notificationService.sendToRole('user', 'Auction Extended',
      `Auction extended: only ${currentBids}/${minBids} bids received. More time added!`);
    return { notified: true };
  }

  @Post('max-bid-reached')
  @HttpCode(200)
  async notifyMaxBidReached(
    @Body('auction_id') auctionId: string,
    @Body('total_bids') totalBids: number,
    @Body('max_bids') maxBids: number,
  ) {
    if (!auctionId) throw new BadRequestException('Missing auction_id');
    await this.notificationService.sendToRole('user', 'Max Bids Reached',
      `Auction reached ${totalBids}/${maxBids} bids and is closing soon!`);
    return { notified: true };
  }

  @Post('ending-soon')
  @HttpCode(200)
  async notifyEndingSoon(
    @Body('user_ids') userIds: string[],
    @Body('auction_id') auctionId: string,
    @Body('product_name') productName: string,
  ) {
    if (!userIds?.length || !auctionId || !productName) {
      throw new BadRequestException('Missing required fields');
    }
    await this.notificationService.sendAuctionEndingSoon(userIds, auctionId, productName);
    return { notified: userIds.length };
  }
}
