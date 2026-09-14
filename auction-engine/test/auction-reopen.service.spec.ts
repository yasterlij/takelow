import { AuctionAdminService } from "../src/modules/admin/auction-admin.service";
import { AuctionStatus } from "@prisma/client";
import { PrismaService } from "../src/prisma/prisma.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

function createMockRepo() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn((e) => Promise.resolve(e)),
    count: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    query: jest.fn(),
    findAndCount: jest.fn(),
  };
}

describe("AuctionAdminService.reopenAuction", () => {
  let service: AuctionAdminService;
  let mockAuctionRepo: ReturnType<typeof createMockRepo>;
  let mockBidRepo: ReturnType<typeof createMockRepo>;
  let mockWinnerRepo: ReturnType<typeof createMockRepo>;
  let mockProductRepo: ReturnType<typeof createMockRepo>;
  let mockAuditRepo: ReturnType<typeof createMockRepo>;
  let mockClosureService: any;
  let mockWinnerService: { cleanupAuctionKeys: jest.Mock };

  beforeEach(() => {
    mockAuctionRepo = createMockRepo();
    mockBidRepo = createMockRepo();
    mockWinnerRepo = createMockRepo();
    mockProductRepo = createMockRepo();
    mockAuditRepo = createMockRepo();
    mockClosureService = {};
    mockWinnerService = { cleanupAuctionKeys: jest.fn().mockResolvedValue(undefined) };

    const mockRepos: Record<string, any> = {
      auction: mockAuctionRepo,
      bid: mockBidRepo,
      winner: mockWinnerRepo,
      product: mockProductRepo,
      auditLog: mockAuditRepo,
    };

    const mockPrisma: any = {
      repository: jest.fn((model: string) => mockRepos[model]),
    };

    service = new AuctionAdminService(
      mockPrisma as unknown as PrismaService,
      mockClosureService,
      mockWinnerService as any,
    );
  });

  it("throws NotFoundException if auction does not exist", async () => {
    mockAuctionRepo.findOne.mockResolvedValue(null);

    await expect(
      service.reopenAuction("nonexistent-id", {
        start_time: "2026-09-15T00:00:00Z",
        end_time: "2026-09-22T00:00:00Z",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("throws BadRequestException if auction is currently active", async () => {
    mockAuctionRepo.findOne.mockResolvedValue({
      id: "auc-active",
      status: AuctionStatus.ACTIVE,
      end_time: new Date(Date.now() + 1000000),
    });

    await expect(
      service.reopenAuction("auc-active", {
        start_time: "2026-09-15T00:00:00Z",
        end_time: "2026-09-22T00:00:00Z",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException if auction closed with a confirmed winning bidder", async () => {
    mockAuctionRepo.findOne.mockResolvedValue({
      id: "auc-won",
      status: AuctionStatus.CLOSED,
      winner_user_id: "user-123",
      end_time: new Date("2026-09-01T00:00:00Z"),
    });

    await expect(
      service.reopenAuction("auc-won", {
        start_time: "2026-09-15T00:00:00Z",
        end_time: "2026-09-22T00:00:00Z",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("throws BadRequestException if end_time is before or equal to start_time", async () => {
    mockAuctionRepo.findOne.mockResolvedValue({
      id: "auc-unsold",
      status: AuctionStatus.EXPIRED,
      winner_user_id: null,
      end_time: new Date("2026-09-01T00:00:00Z"),
    });
    mockWinnerRepo.find.mockResolvedValue([]);

    await expect(
      service.reopenAuction("auc-unsold", {
        start_time: "2026-09-20T00:00:00Z",
        end_time: "2026-09-19T00:00:00Z",
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it("successfully reopens an unsold auction and cleans prior bids and Redis state", async () => {
    const existingAuction = {
      id: "auc-unsold",
      product_id: "prod-1",
      status: AuctionStatus.CLOSED,
      winner_user_id: null,
      winning_bid_amount: 15,
      payment_status: "EXPIRED",
      payment_deadline: new Date(),
      extensions: 2,
      start_time: new Date("2026-09-01T00:00:00Z"),
      end_time: new Date("2026-09-08T00:00:00Z"),
      product: { id: "prod-1", name: "iPhone 15", current_market_price: 50000 },
    };

    mockAuctionRepo.findOne.mockResolvedValue(existingAuction);
    mockWinnerRepo.find.mockResolvedValue([]);
    mockBidRepo.count.mockResolvedValue(4);

    const newStart = "2026-09-15T10:00:00.000Z";
    const newEnd = "2026-09-22T10:00:00.000Z";

    const result = await service.reopenAuction("auc-unsold", {
      start_time: newStart,
      end_time: newEnd,
      min_bid: 10,
      bid_fee: 5,
    }, "admin-user-1");

    expect(mockWinnerRepo.delete).toHaveBeenCalledWith({ where: { auction_id: "auc-unsold" } });
    expect(mockBidRepo.delete).toHaveBeenCalledWith({ where: { auction_id: "auc-unsold" } });
    expect(mockWinnerService.cleanupAuctionKeys).toHaveBeenCalledWith("auc-unsold");

    expect(result.status).toBe(AuctionStatus.ACTIVE);
    expect(result.start_time).toEqual(new Date(newStart));
    expect(result.end_time).toEqual(new Date(newEnd));
    expect(result.winner_user_id).toBeNull();
    expect(result.winning_bid_amount).toBeNull();
    expect(result.payment_status).toBeNull();
    expect(result.extensions).toBe(0);
    expect(result.stats).toEqual({ total_bids: 0, unique_bidders: 0 });

    expect(mockAuditRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: "admin-user-1",
        action: "AUCTION_REOPENED",
        entity_id: "auc-unsold",
      }),
    );
  });
});
