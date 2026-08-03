import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BiddingController } from '../src/modules/bidding/bidding.controller';
import { BiddingService } from '../src/modules/bidding/bidding.service';
import { WinnerService } from '../src/modules/winner/winner.service';
import { BidEncryptionService } from '../src/modules/common/bid-encryption.service';
import { AuctionReviewService } from '../src/modules/admin/auction-review.service';
import { Auction } from '../src/modules/winner/entities/auction.entity';
import { Bid } from '../src/modules/bidding/entities/bid.entity';
import { Winner } from '../src/modules/winner/entities/winner.entity';
import { REDIS_CLIENT } from '../src/modules/common/redis.decorator';
import { NotificationDispatchService } from '../src/modules/worker/notification-dispatch.service';

function createMockRepo() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    save: jest.fn((x: any) => x),
  };
}

describe('BiddingController', () => {
  let controller: BiddingController;
  let mockBidRepo: ReturnType<typeof createMockRepo>;
  let mockBidEncryption: { decrypt: jest.Mock };
  let mockAuctionReviewService: { drawWinner: jest.Mock };

  beforeEach(async () => {
    mockBidRepo = createMockRepo();
    mockBidEncryption = { decrypt: jest.fn().mockReturnValue('30.50') };
    mockAuctionReviewService = { drawWinner: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BiddingController],
      providers: [
        { provide: BiddingService, useValue: {} },
        { provide: WinnerService, useValue: {} },
        { provide: AuctionReviewService, useValue: mockAuctionReviewService },
        { provide: BidEncryptionService, useValue: mockBidEncryption },
        { provide: REDIS_CLIENT, useValue: {} },
        { provide: NotificationDispatchService, useValue: { dispatch: jest.fn() } },
        { provide: getRepositoryToken(Auction), useValue: createMockRepo() },
        { provide: getRepositoryToken(Bid), useValue: mockBidRepo },
      ],
    }).compile();
    controller = module.get<BiddingController>(BiddingController);
  });

  it('returns only the current user bids for the auction, decrypting encrypted amounts', async () => {
    mockBidRepo.find.mockResolvedValue([
      { amount: 50.01, encrypted_amount: '', bid_time: new Date('2026-01-01'), ticket_number: 'BID_1' },
      { amount: 0, encrypted_amount: 'enc', bid_time: new Date('2026-01-02'), ticket_number: 'BID_2' },
    ]);

    const result = await controller.getMyBids('auc-1', { user: { id: 'user-1' } });

    expect(mockBidRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { auction_id: 'auc-1', user_id: 'user-1' } }),
    );
    expect(mockBidEncryption.decrypt).toHaveBeenCalledWith('enc');
    expect(result).toEqual({
      auction_id: 'auc-1',
      bids: [
        { amount: 50.01, bid_time: expect.any(Date), ticket_number: 'BID_1' },
        { amount: 30.5, bid_time: expect.any(Date), ticket_number: 'BID_2' },
      ],
    });
  });

  it('falls back to base bid columns when legacy schemas are missing encrypted bid fields for my bids', async () => {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([
        {
          bid_id: 'bid-1',
          bid_user_id: 'user-1',
          bid_auction_id: 'auc-1',
          bid_amount: 50.01,
          bid_bid_time: new Date('2026-01-01'),
          bid_service_fee_paid: true,
        },
      ]),
    };
    mockBidRepo.find.mockRejectedValue(
      new Error('column bids.encrypted_amount does not exist'),
    );
    mockBidRepo.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await controller.getMyBids('auc-1', { user: { id: 'user-1' } });

    expect(mockBidRepo.createQueryBuilder).toHaveBeenCalledWith('bid');
    expect(result).toEqual({
      auction_id: 'auc-1',
      bids: [
        { amount: 50.01, bid_time: expect.any(Date), ticket_number: '' },
      ],
    });
  });

  it('reuses the review-service winner payload and appends the current user latest bid', async () => {
    const reviewPayload = {
      id: 'auc-1',
      product: { id: 'prod-1', name: 'Phone' },
      status: 'CLOSED',
      winner_user_id: 'winner-1',
      winner_name: 'Winner One',
      winner_phone: '0911223344',
      winning_bid_amount: 25,
      total_bids: 3,
      unique_bidders: 2,
      lowest_unique_bid: 25,
      all_winners: [{ user_id: 'winner-1', amount: 25, rank: 1 }],
      winners_count: 1,
      bids: [{ amount: 25 }],
      created_at: new Date('2026-01-03'),
    };
    mockAuctionReviewService.drawWinner.mockResolvedValue(reviewPayload);
    mockBidRepo.findOne.mockResolvedValue({
      amount: 0,
      encrypted_amount: 'enc',
      bid_time: new Date('2026-01-02'),
      service_fee_paid: true,
    });

    const result = await controller.getAuctionResult('auc-1', {
      user: { id: 'user-1' },
    });

    expect(mockAuctionReviewService.drawWinner).toHaveBeenCalledWith('auc-1');
    expect(mockBidRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { auction_id: 'auc-1', user_id: 'user-1' },
        order: { bid_time: 'DESC' },
      }),
    );
    expect(result).toEqual({
      id: 'auc-1',
      product: { id: 'prod-1', name: 'Phone' },
      status: 'CLOSED',
      winner_user_id: 'winner-1',
      winner_name: 'Winner One',
      winner_phone: '0911223344',
      winning_bid_amount: 25,
      total_bids: 3,
      unique_bidders: 2,
      lowest_unique_bid: 25,
      all_winners: [{ user_id: 'winner-1', amount: 25, rank: 1 }],
      winners_count: 1,
      created_at: expect.any(Date),
      my_bid: {
        amount: 30.5,
        encrypted_amount: null,
        amount_encrypted: false,
        bid_time: expect.any(Date),
        service_fee_paid: true,
      },
    });
  });
});
