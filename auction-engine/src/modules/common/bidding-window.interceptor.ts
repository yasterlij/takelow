import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Auction, AuctionStatus } from "../winner/entities/auction.entity";

@Injectable()
export class BiddingWindowInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const auctionId = request.params.id;

    const auction = await this.auctionRepository.findOne({
      where: { id: auctionId, status: AuctionStatus.ACTIVE },
    });

    if (!auction) {
      throw new ForbiddenException("Auction not found or not active");
    }

    const now = Date.now();
    if (now > auction.end_time.getTime()) {
      throw new ForbiddenException("Auction Closed");
    }

    request.auction = auction;
    return next.handle();
  }
}
