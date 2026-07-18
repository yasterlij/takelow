import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WalletService } from '../src/modules/wallet/wallet.service';
import { User } from '../src/modules/auth/entities/user.entity';
import { Transaction } from '../src/modules/wallet/entities/transaction.entity';

describe('WalletService Integration (Section 11.2)', () => {
  let service: WalletService;
  let mockUserRepo: Partial<Record<keyof Repository<User>, jest.Mock>>;
  let mockTxRepo: Partial<Record<keyof Repository<Transaction>, jest.Mock>>;
  let mockDataSource: Partial<Record<keyof DataSource, any>>;
  let mockQueryRunner: any;

  beforeEach(async () => {
    mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
        query: jest.fn(),
      },
    };

    mockDataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
    };

    mockUserRepo = {
      findOne: jest.fn(),
    };

    mockTxRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Transaction), useValue: mockTxRepo },
        { provide: DataSource, useValue: mockDataSource },
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

      mockQueryRunner.manager.findOne.mockResolvedValue(user);
      mockQueryRunner.manager.save.mockResolvedValue({ ...user, wallet_balance: 50 });

      await service.deductBidFee('user-1', 50);

      expect(mockQueryRunner.manager.save).toHaveBeenCalled();
      const savedUser = mockQueryRunner.manager.save.mock.calls[0][0];
      expect(savedUser.wallet_balance).toBe(50);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should throw Insufficient Funds when balance < fee', async () => {
      const user = {
        id: 'user-1',
        wallet_balance: 30,
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(user);

      await expect(service.deductBidFee('user-1', 50)).rejects.toThrow(
        'Insufficient wallet balance',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });
});
