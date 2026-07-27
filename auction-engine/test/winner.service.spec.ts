import { Test, TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { WinnerService } from '../src/modules/winner/winner.service';
import { REDIS_CLIENT } from '../src/modules/common/redis.decorator';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Bid } from '../src/modules/bidding/entities/bid.entity';
import { Auction } from '../src/modules/winner/entities/auction.entity';
import { Winner } from '../src/modules/winner/entities/winner.entity';

function createMockRedis(): Partial<Record<keyof Redis, jest.Mock>> {
  return {
    get: jest.fn(),
    zrange: jest.fn(),
    zscore: jest.fn(),
    del: jest.fn(),
  };
}

function createMockRepo() {
  return {
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ count: '0' }),
      getRawMany: jest.fn().mockResolvedValue([{ amount: 2, user_id: 'user-1' }]),
    })),
  };
}

describe('WinnerService (Section 11.1 - Test Case 1 & 2)', () => {
  let service: WinnerService;
  let mockRedis: ReturnType<typeof createMockRedis>;
  let mockBidRepo: ReturnType<typeof createMockRepo>;
  let mockAuctionRepo: ReturnType<typeof createMockRepo>;
  let mockWinnerRepo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    mockRedis = createMockRedis();
    mockBidRepo = createMockRepo();
    mockAuctionRepo = createMockRepo();
    mockWinnerRepo = createMockRepo();

    mockAuctionRepo.findOne.mockResolvedValue({ num_winners: 1 });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WinnerService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: getRepositoryToken(Bid), useValue: mockBidRepo },
        { provide: getRepositoryToken(Auction), useValue: mockAuctionRepo },
        { provide: getRepositoryToken(Winner), useValue: mockWinnerRepo },
      ],
    }).compile();

    service = module.get<WinnerService>(WinnerService);
  });

  it('Test Case 1: bids [1, 1, 2, 3] should return winner amount 2', async () => {
    (mockRedis.get as jest.Mock).mockResolvedValue('4');
    (mockRedis.zrange as jest.Mock).mockResolvedValue(['2']);
    (mockRedis.zscore as jest.Mock).mockResolvedValue('1');

    const result = await service.calculateWinners('auction-1');

    expect(result.winningAmounts).toEqual([2]);
    expect(result.totalBids).toBe(4);
    expect(mockRedis.zrange).toHaveBeenCalledWith(
      'takelow:auction:auction-1:unique_bids',
      0,
      0,
    );
  });

  it('Test Case 2: bids [1, 1, 2, 2] should return no winners (all dupes)', async () => {
    (mockRedis.get as jest.Mock).mockResolvedValue('4');
    (mockRedis.zrange as jest.Mock).mockResolvedValue([]);

    const result = await service.calculateWinners('auction-2');

    expect(result.winningAmounts).toEqual([]);
    expect(result.totalBids).toBe(4);
  });

  it('should return empty when total_bids is 0', async () => {
    (mockRedis.get as jest.Mock).mockResolvedValue('0');

    const result = await service.calculateWinners('auction-3');

    expect(result.winningAmounts).toEqual([]);
    expect(result.totalBids).toBe(0);
  });

  it('should handle decimal amounts in Redis', async () => {
    (mockRedis.get as jest.Mock).mockResolvedValue('3');
    (mockRedis.zrange as jest.Mock).mockResolvedValue(['1.50']);
    (mockRedis.zscore as jest.Mock).mockResolvedValue('1');

    const result = await service.calculateWinners('auction-4');

    expect(result.winningAmounts).toEqual([1.5]);
    expect(result.totalBids).toBe(3);
  });
});
