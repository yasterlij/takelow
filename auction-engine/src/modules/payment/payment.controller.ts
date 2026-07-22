import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentService } from './payment.service';
import { Auction, AuctionStatus as AS, PaymentStatus } from '../winner/entities/auction.entity';

const BID_FEE = 50;

@Controller('payments')
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post(':auctionId/link')
  async createPaymentLink(@Param('auctionId') auctionId: string, @Req() req: any) {
    const user = req.user;
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ['product'],
    });
    if (!auction) throw new NotFoundException('Auction not found');
    if (auction.winner_user_id !== user.id) {
      throw new BadRequestException('Only the winner can initiate payment');
    }
    if (auction.status !== AS.CLOSED || auction.payment_status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Auction is not eligible for payment');
    }

    const description = `Payment for ${auction.product?.name || auction.id}`;
    const result = await this.paymentService.createPaymentLink(
      auctionId,
      user.id,
      Number(auction.winning_bid_amount),
      description,
    );
    return { payment_url: result.paymentUrl, transaction_id: result.transactionId };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post(':auctionId/confirm')
  async confirmPayment(@Param('auctionId') auctionId: string, @Req() req: any) {
    try {
      await this.paymentService.markAsPaid(auctionId);
      return { paid: true };
    } catch (e) {
      if (e.message?.includes('not found')) throw new NotFoundException(e.message);
      throw new BadRequestException(e.message);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get(':auctionId/status')
  async getPaymentLinkStatus(@Param('auctionId') auctionId: string, @Req() req: any) {
    const transaction = await this.paymentService.findTransaction(auctionId, req.user.id);
    return {
      status: transaction?.status || 'NONE',
      payment_url: transaction?.sikina_payment_url || null,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('bid-fee/:auctionId/link')
  async createBidFeePaymentLink(@Param('auctionId') auctionId: string, @Req() req: any) {
    const user = req.user;
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new NotFoundException('Auction not found');
    if (auction.status !== AS.ACTIVE) {
      throw new BadRequestException('Auction is not active');
    }

    const result = await this.paymentService.createBidFeePaymentLink(
      auctionId,
      user.id,
      BID_FEE,
    );
    return { payment_url: result.paymentUrl, transaction_id: result.transactionId };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('bid-fee/:auctionId/status')
  async getBidFeePaymentStatus(@Param('auctionId') auctionId: string, @Req() req: any) {
    return this.paymentService.getBidFeePaymentStatus(auctionId, req.user.id);
  }
}
