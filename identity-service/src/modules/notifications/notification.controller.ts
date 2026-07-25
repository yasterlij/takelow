import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  BadRequestException,
  Logger,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService, WinnerNotificationPayload } from './notification.service';

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
    @Body('winning_amount') winningAmount?: number,
    @Body('product_description') productDescription?: string,
    @Body('collection_location') collectionLocation?: string,
    @Body('collection_method') collectionMethod?: string,
    @Body('collection_instructions') collectionInstructions?: string,
  ) {
    if (!userId || !auctionId || !productName) {
      throw new BadRequestException('Missing required fields: user_id, auction_id, product_name');
    }

    const payload: WinnerNotificationPayload = {
      user_id: userId,
      auction_id: auctionId,
      product_name: productName,
      product_description: productDescription,
      winning_amount: winningAmount ?? 0,
      payment_deadline: paymentDeadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      collection_location: collectionLocation,
      collection_method: collectionMethod,
      collection_instructions: collectionInstructions,
    };

    await this.notificationService.sendWinnerNotification(payload);
    return { notified: true };
  }

  @Post('winner-bulk')
  @HttpCode(200)
  async notifyWinnersBulk(
    @Body('winners') winners: Array<{
      user_id: string;
      auction_id: string;
      product_name: string;
      winning_amount: number;
      payment_deadline: string;
      product_description?: string;
      collection_location?: string;
      collection_method?: string;
      collection_instructions?: string;
    }>,
  ) {
    if (!winners?.length) {
      throw new BadRequestException('No winners provided');
    }
    for (const w of winners) {
      try {
        await this.notificationService.sendWinnerNotification({
          user_id: w.user_id,
          auction_id: w.auction_id,
          product_name: w.product_name,
          product_description: w.product_description,
          winning_amount: w.winning_amount,
          payment_deadline: w.payment_deadline,
          collection_location: w.collection_location,
          collection_method: w.collection_method,
          collection_instructions: w.collection_instructions,
        });
      } catch (e) {
        this.logger.warn(`Failed to notify winner ${w.user_id}: ${e.message}`);
      }
    }
    return { notified: winners.length };
  }

  @Post('bid-confirmation')
  @HttpCode(200)
  async sendBidConfirmationSms(
    @Body('phone') phone: string,
    @Body('product_name') productName: string,
    @Body('bid_amount') bidAmount: number,
    @Body('ticket_number') ticketNumber: string,
  ) {
    if (!phone || !productName || !bidAmount) {
      throw new BadRequestException('Missing required fields');
    }
    const text = `Your bid of ETB ${bidAmount} on '${productName}' has been placed successfully. Your BID ticket number is: ${ticketNumber || 'N/A'}`;
    await this.notificationService.sendSms(phone, text);
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

  @UseGuards(AuthGuard('jwt'))
  @Get('inbox')
  async getInAppNotifications(
    @Req() req: any,
    @Query('unread') unreadOnly?: string,
  ) {
    return this.notificationService.getInAppNotifications(req.user.id, unreadOnly === 'true');
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('inbox/:id/read')
  @HttpCode(200)
  async markNotificationRead(@Param('id') id: string) {
    await this.notificationService.markNotificationRead(id);
    return { read: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('inbox/read-all')
  @HttpCode(200)
  async markAllNotificationsRead(@Req() req: any) {
    await this.notificationService.markAllNotificationsRead(req.user.id);
    return { read: true };
  }
}
