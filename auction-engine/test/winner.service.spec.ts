import { Test, TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import { WinnerService } from '../src/modules/winner/winner.service';
import { REDIS_CLIENT } from '../src/modules/common/redis.decorator';

function createMockRedis(): Partial<Record<keyof Redis, jest.Mock>> {
  return {
    get: jest.fn(),
    zrangebyscore: jest.fn(),
    del: jest.fn(),
  };
}

describe('WinnerService (Section 11.1 - Test Case 1 & 2)', () => {
  let service: WinnerService;
  let mockRedis: ReturnType<typeof createMockRedis>;

  beforeEach(async () => {
    mockRedis = createMockRedis();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WinnerService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<WinnerService>(WinnerService);
  });

  it('Test Case 1: bids [1, 1, 2, 3] should return winner amount 2', async () => {
    (mockRedis.get as jest.Mock).mockResolvedValue('4');
    (mockRedis.zrangebyscore as jest.Mock).mockResolvedValue(['2', '0']);

    const result = await service.calculateWinner('auction-1');

    expect(result.winningAmount).toBe(2);
    expect(result.totalBids).toBe(4);
    expect(mockRedis.zrangebyscore).toHaveBeenCalledWith(
      'takelow:auction:auction-1:unique_bids',
      0,
      0,
      'WITHSCORES',
      'LIMIT',
      0,
      1,
    );
  });

  it('Test Case 2: bids [1, 1, 2, 2] should return null (no unique)', async () => {
    (mockRedis.get as jest.Mock).mockResolvedValue('4');
    (mockRedis.zrangebyscore as jest.Mock).mockResolvedValue([]);

    const result = await service.calculateWinner('auction-2');

    expect(result.winningAmount).toBeNull();
    expect(result.totalBids).toBe(4);
  });

  it('should return null when total_bids is 0', async () => {
    (mockRedis.get as jest.Mock).mockResolvedValue('0');

    const result = await service.calculateWinner('auction-3');

    expect(result.winningAmount).toBeNull();
    expect(result.totalBids).toBe(0);
  });
});
