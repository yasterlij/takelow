import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Req,
  Res,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Query,
  Logger,
  HttpStatus,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaymentService } from "./payment.service";
import {
  Auction,
  AuctionStatus as AS,
  PaymentStatus,
} from "../winner/entities/auction.entity";
import { ConfigService } from "@nestjs/config";

@Controller("payments")
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);
  private readonly bidFee: number;

  constructor(
    private paymentService: PaymentService,
    private configService: ConfigService,
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
  ) {
    this.bidFee = this.configService.get<number>("app.bidFee")!;
  }

  @UseGuards(AuthGuard("jwt"))
  @Post(":auctionId/link")
  async createPaymentLink(
    @Param("auctionId") auctionId: string,
    @Req() req: any,
    @Query("payment_method") paymentMethod?: string,
    @Query("customer_phone") customerPhone?: string,
  ) {
    const user = req.user;
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    });
    if (!auction) throw new NotFoundException("Auction not found");
    if (auction.winner_user_id !== user.id) {
      throw new BadRequestException("Only the winner can initiate payment");
    }
    if (
      auction.status !== AS.CLOSED ||
      auction.payment_status !== PaymentStatus.PENDING
    ) {
      throw new BadRequestException("Auction is not eligible for payment");
    }

    const method = (paymentMethod as "SIKINAPAY" | "AWASH") || "SIKINAPAY";

    const description = `Payment for ${auction.product?.name || auction.id}`;
    const result = await this.paymentService.createPaymentLink(
      auctionId,
      user.id,
      Number(auction.winning_bid_amount),
      description,
      method,
      customerPhone,
    );
    return {
      payment_url: result.paymentUrl,
      proxy_url: result.proxyUrl,
      transaction_id: result.transactionId,
      gateway: method,
    };
  }

  @UseGuards(AuthGuard("jwt"))
  @Post(":auctionId/confirm")
  async confirmPayment(@Param("auctionId") auctionId: string, @Req() req: any) {
    try {
      await this.paymentService.markAsPaid(auctionId);
      return { paid: true };
    } catch (e) {
      if (e.message?.includes("not found"))
        throw new NotFoundException(e.message);
      throw new BadRequestException(e.message);
    }
  }

  @UseGuards(AuthGuard("jwt"))
  @Get(":auctionId/status")
  async getPaymentLinkStatus(
    @Param("auctionId") auctionId: string,
    @Req() req: any,
  ) {
    const transaction = await this.paymentService.findTransaction(
      auctionId,
      req.user.id,
    );
    return {
      status: transaction?.status || "NONE",
      payment_url:
        transaction?.sikina_payment_url ||
        transaction?.awash_payment_url ||
        null,
      gateway: transaction?.gateway || "SIKINAPAY",
    };
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("bid-fee/:auctionId/link")
  async createBidFeePaymentLink(
    @Param("auctionId") auctionId: string,
    @Req() req: any,
  ) {
    const user = req.user;
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new NotFoundException("Auction not found");
    if (auction.status !== AS.ACTIVE) {
      throw new BadRequestException("Auction is not active");
    }
    if (Date.now() > auction.end_time.getTime()) {
      throw new BadRequestException("Auction has already ended");
    }

    const bidFee = Number(auction.bid_fee ?? this.bidFee);
    if (bidFee < 1) {
      throw new BadRequestException("Bid fee must be at least 1.00");
    }
    const result = await this.paymentService.createBidFeePaymentLink(
      auctionId,
      user.id,
      bidFee,
    );
    return {
      payment_url: result.paymentUrl,
      proxy_url: result.proxyUrl,
      transaction_id: result.transactionId,
    };
  }

  @UseGuards(AuthGuard("jwt"))
  @Get("bid-fee/:auctionId/status")
  async getBidFeePaymentStatus(
    @Param("auctionId") auctionId: string,
    @Req() req: any,
  ) {
    return this.paymentService.getBidFeePaymentStatus(auctionId, req.user.id);
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("bid-fee/:auctionId/confirm")
  async confirmBidFeePayment(
    @Param("auctionId") auctionId: string,
    @Req() req: any,
  ) {
    try {
      const result = await this.paymentService.getBidFeePaymentStatus(
        auctionId,
        req.user.id,
      );
      if (result.status === "SUCCESSFUL") {
        return { paid: true };
      }
      throw new BadRequestException("Bid fee payment not yet confirmed");
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof BadRequestException) {
        throw e;
      }
      throw new NotFoundException("Bid fee payment not confirmed");
    }
  }

  @UseGuards(AuthGuard("jwt"))
  @Post("bid-fee/:auctionId/wallet-pay")
  async payBidFeeWithWallet(
    @Param("auctionId") auctionId: string,
    @Req() req: any,
  ) {
    const user = req.user;
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
    });
    if (!auction) throw new NotFoundException("Auction not found");
    if (auction.status !== AS.ACTIVE) {
      throw new BadRequestException("Auction is not active");
    }
    if (Date.now() > auction.end_time.getTime()) {
      throw new BadRequestException("Auction has already ended");
    }

    const bidFee = Number(auction.bid_fee ?? this.bidFee);
    if (bidFee < 1) {
      throw new BadRequestException("Bid fee must be at least 1.00");
    }
    await this.paymentService.createBidFeeWalletPayment(
      auctionId,
      user.id,
      bidFee,
    );
    return { paid: true };
  }

  @UseGuards(AuthGuard("jwt"))
  @Post(":auctionId/wallet-pay")
  async payWinningWithWallet(
    @Param("auctionId") auctionId: string,
    @Req() req: any,
  ) {
    const user = req.user;
    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId },
      relations: ["product"],
    });
    if (!auction) throw new NotFoundException("Auction not found");
    if (auction.winner_user_id !== user.id) {
      throw new BadRequestException("Only the winner can initiate payment");
    }
    if (
      auction.status !== AS.CLOSED ||
      auction.payment_status !== PaymentStatus.PENDING
    ) {
      throw new BadRequestException("Auction is not eligible for payment");
    }

    await this.paymentService.createWinningWalletPayment(
      auctionId,
      user.id,
      Number(auction.winning_bid_amount),
    );
    return { paid: true };
  }

  @Get("proxy/:transactionId")
  async proxyPaymentPage(
    @Param("transactionId") transactionId: string,
    @Query("token") token: string,
    @Res() res: any,
  ) {
    if (!token) throw new BadRequestException("Missing proxy token");
    if (!this.paymentService.validateProxyToken(transactionId, token)) {
      throw new ForbiddenException("Invalid or expired proxy token");
    }

    const transaction = await this.paymentService.findTransactionById(
      transactionId,
    );
    if (!transaction) throw new NotFoundException("Transaction not found");

    const paymentUrl =
      transaction.sikina_payment_url || transaction.awash_payment_url;
    if (!paymentUrl) throw new NotFoundException("Payment URL not found");

    try {
      const { body, contentType } =
        await this.paymentService.fetchAndProxyPaymentPage(paymentUrl);

      res.setHeader("Content-Type", contentType);
      res.setHeader("X-Frame-Options", "ALLOWALL");
      res.removeHeader("Content-Security-Policy");
      res.removeHeader("Cross-Origin-Resource-Policy");
      return res.status(HttpStatus.OK).send(body);
    } catch (e) {
      this.logger.error(`Payment proxy failed: ${e.message}`);
      throw new BadRequestException("Failed to load payment page");
    }
  }
}
