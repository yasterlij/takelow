"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const winner_service_1 = require("../src/modules/winner/winner.service");
const redis_decorator_1 = require("../src/modules/common/redis.decorator");
function createMockRedis() {
    return {
        get: jest.fn(),
        zrangebyscore: jest.fn(),
        del: jest.fn(),
    };
}
describe('WinnerService (Section 11.1 - Test Case 1 & 2)', () => {
    let service;
    let mockRedis;
    beforeEach(async () => {
        mockRedis = createMockRedis();
        const module = await testing_1.Test.createTestingModule({
            providers: [
                winner_service_1.WinnerService,
                { provide: redis_decorator_1.REDIS_CLIENT, useValue: mockRedis },
            ],
        }).compile();
        service = module.get(winner_service_1.WinnerService);
    });
    it('Test Case 1: bids [1, 1, 2, 3] should return winner amount 2', async () => {
        mockRedis.get.mockResolvedValue('4');
        mockRedis.zrangebyscore.mockResolvedValue(['2', '0']);
        const result = await service.calculateWinner('auction-1');
        expect(result.winningAmount).toBe(2);
        expect(result.totalBids).toBe(4);
        expect(mockRedis.zrangebyscore).toHaveBeenCalledWith('takelow:auction:auction-1:unique_bids', 0, 0, 'WITHSCORES', 'LIMIT', 0, 1);
    });
    it('Test Case 2: bids [1, 1, 2, 2] should return null (no unique)', async () => {
        mockRedis.get.mockResolvedValue('4');
        mockRedis.zrangebyscore.mockResolvedValue([]);
        const result = await service.calculateWinner('auction-2');
        expect(result.winningAmount).toBeNull();
        expect(result.totalBids).toBe(4);
    });
    it('should return null when total_bids is 0', async () => {
        mockRedis.get.mockResolvedValue('0');
        const result = await service.calculateWinner('auction-3');
        expect(result.winningAmount).toBeNull();
        expect(result.totalBids).toBe(0);
    });
});
//# sourceMappingURL=winner.service.spec.js.map