import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../src/modules/wallet/wallet.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('WalletService Integration (Section 11.2)', () => {
  let service: WalletService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn(async (fn: (tx: any) => Promise<any>) => {
        const tx = {
          user: {
            findUnique: jest.fn(),
            update: jest.fn(),
          },
          transaction: {
            create: jest.fn(),
          },
        };
        return fn(tx);
      }),
      transaction: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
  });

  describe('deductBidFee', () => {
    it('should deduct bid fee from wallet balance', async () => {
      const user = {
        id: 'user-1',
        wallet_balance: 100,
        phone_number: '+251911111111',
      };

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(user),
            update: jest.fn().mockResolvedValue({ ...user, wallet_balance: 50 }),
          },
          transaction: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return fn(tx);
      });

      await service.deductBidFee('user-1', 50);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw Insufficient Funds when balance < fee', async () => {
      const user = {
        id: 'user-1',
        wallet_balance: 30,
      };

      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue(user),
            update: jest.fn(),
          },
          transaction: {
            create: jest.fn(),
          },
        };
        return fn(tx);
      });

      await expect(service.deductBidFee('user-1', 50)).rejects.toThrow(
        'Insufficient wallet balance',
      );
    });
  });
});