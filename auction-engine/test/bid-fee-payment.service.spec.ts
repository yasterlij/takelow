import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { PaymentService } from '../src/modules/payment/payment.service';
import { SikinaService } from '../src/modules/payment/sikina.service';
import { PaymentTransaction, PaymentTransactionStatus, PaymentType } from '../src/modules/payment/entities/payment-transaction.entity';
import { Auction } from '../src/modules/winner/entities/auction.entity';
import { Bid } from '../src/modules/bidding/entities/bid.entity';
import { WinnerService } from '../src/modules/winner/winner.service';

function createMockRepo() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
}

describe('PaymentService - Bid Fee Payment', () => {
  let service: PaymentService;
  let mockPaymentTransactionRepo: ReturnType<typeof createMockRepo>;
  let mockAuctionRepo: ReturnType<typeof createMockRepo>;
  let mockBidRepo: ReturnType<typeof createMockRepo>;
  let mockSikinaService: Partial<SikinaService>;
  let mockWinnerService: Partial<WinnerService>;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockPaymentTransactionRepo = createMockRepo();
    mockAuctionRepo = createMockRepo();
    mockBidRepo = createMockRepo();
    
    mockSikinaService = {
      generatePaymentLink: jest.fn(),
    };
    
    mockWinnerService = {};
    
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          'app.sikinaSuccessRedirectUrl': 'https://example.com/success',
          'app.sikinaFailedRedirectUrl': 'https://example.com/failed',
          'app.appBaseUrl': 'http://localhost:5173',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Auction), useValue: mockAuctionRepo },
        { provide: getRepositoryToken(Bid), useValue: mockBidRepo },
        { provide: getRepositoryToken(PaymentTransaction), useValue: mockPaymentTransactionRepo },
        { provide: WinnerService, useValue: mockWinnerService },
        { provide: SikinaService, useValue: mockSikinaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  describe('createBidFeePaymentLink', () => {
    it('should create a bid fee payment link successfully', async () => {
      const auctionId = 'bef09c86-21da-4db7-b02e-933f8fb83132';
      const userId = 'af372c9d-2d80-4db9-ae53-e3bc47531f12';
      const amount = 50;

      mockPaymentTransactionRepo.findOne.mockResolvedValue(null);
      
      const mockSikinaResponse = {
        paymentUrl: 'https://sandbox.sikinapay.com/checkout/web/TEST123',
        responseCode: '0',
        responseStatus: 'SUCCESS',
        responseMessage: 'Success',
        currentDate: '2026-07-22',
        currentTime: '12:00:00',
      };
      (mockSikinaService.generatePaymentLink as jest.Mock).mockResolvedValue(mockSikinaResponse);

      const mockTransaction = {
        id: 'txn-123',
        auction_id: auctionId,
        user_id: userId,
        amount,
        client_reference_id: 'fee-bef09c86-af372c9d-1234567890',
        sikina_payment_url: mockSikinaResponse.paymentUrl,
        status: PaymentTransactionStatus.PENDING,
        currency: 'ETB',
        payment_type: PaymentType.BID_FEE,
      };
      mockPaymentTransactionRepo.create.mockReturnValue(mockTransaction);
      mockPaymentTransactionRepo.save.mockResolvedValue(mockTransaction);

      const result = await service.createBidFeePaymentLink(auctionId, userId, amount);

      expect(result).toEqual({
        paymentUrl: mockSikinaResponse.paymentUrl,
        transactionId: 'txn-123',
      });

      expect(mockSikinaService.generatePaymentLink).toHaveBeenCalledWith(
        expect.objectContaining({
          amount,
          description: `Bid fee for auction ${auctionId}`,
          language: 'en',
        }),
      );

      expect(mockPaymentTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          auction_id: auctionId,
          user_id: userId,
          amount,
          payment_type: PaymentType.BID_FEE,
          status: PaymentTransactionStatus.PENDING,
        }),
      );
    });

    it('should return existing pending payment link if found', async () => {
      const auctionId = 'bef09c86-21da-4db7-b02e-933f8fb83132';
      const userId = 'af372c9d-2d80-4db9-ae53-e3bc47531f12';
      const amount = 50;

      const existingTransaction = {
        id: 'txn-existing',
        sikina_payment_url: 'https://sandbox.sikinapay.com/checkout/web/EXISTING',
      };
      mockPaymentTransactionRepo.findOne.mockResolvedValue(existingTransaction);

      const result = await service.createBidFeePaymentLink(auctionId, userId, amount);

      expect(result).toEqual({
        paymentUrl: existingTransaction.sikina_payment_url,
        transactionId: existingTransaction.id,
      });

      expect(mockSikinaService.generatePaymentLink).not.toHaveBeenCalled();
      expect(mockPaymentTransactionRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('getBidFeePaymentStatus', () => {
    it('should return SUCCESSFUL status when payment is successful', async () => {
      const auctionId = 'bef09c86-21da-4db7-b02e-933f8fb83132';
      const userId = 'af372c9d-2d80-4db9-ae53-e3bc47531f12';

      const mockTransaction = {
        status: PaymentTransactionStatus.SUCCESSFUL,
        sikina_payment_url: 'https://sandbox.sikinapay.com/checkout/web/TEST123',
      };
      mockPaymentTransactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.getBidFeePaymentStatus(auctionId, userId);

      expect(result).toEqual({
        status: 'SUCCESSFUL',
        payment_url: mockTransaction.sikina_payment_url,
      });

      expect(mockPaymentTransactionRepo.findOne).toHaveBeenCalledWith({
        where: {
          auction_id: auctionId,
          user_id: userId,
          payment_type: PaymentType.BID_FEE,
        },
        order: { created_at: 'DESC' },
      });
    });

    it('should return NONE status when no payment found', async () => {
      const auctionId = 'bef09c86-21da-4db7-b02e-933f8fb83132';
      const userId = 'af372c9d-2d80-4db9-ae53-e3bc47531f12';

      mockPaymentTransactionRepo.findOne.mockResolvedValue(null);

      const result = await service.getBidFeePaymentStatus(auctionId, userId);

      expect(result).toEqual({
        status: 'NONE',
        payment_url: null,
      });
    });

    it('should return PENDING status when payment is pending', async () => {
      const auctionId = 'bef09c86-21da-4db7-b02e-933f8fb83132';
      const userId = 'af372c9d-2d80-4db9-ae53-e3bc47531f12';

      const mockTransaction = {
        status: PaymentTransactionStatus.PENDING,
        sikina_payment_url: 'https://sandbox.sikinapay.com/checkout/web/TEST123',
      };
      mockPaymentTransactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.getBidFeePaymentStatus(auctionId, userId);

      expect(result).toEqual({
        status: 'PENDING',
        payment_url: mockTransaction.sikina_payment_url,
      });
    });
  });

  describe('handleSuccessfulPayment', () => {
    it('should mark auction as paid for WINNING_BID payment type', async () => {
      const clientReferenceId = 'pay-bef09c86-1234567890';
      const paymentReferenceId = 'sikina-ref-123';
      const auctionId = 'bef09c86-21da-4db7-b02e-933f8fb83132';

      const mockTransaction = {
        id: 'txn-123',
        client_reference_id: clientReferenceId,
        auction_id: auctionId,
        user_id: 'user-123',
        payment_type: PaymentType.WINNING_BID,
        status: PaymentTransactionStatus.PENDING,
      };
      mockPaymentTransactionRepo.findOne.mockResolvedValue(mockTransaction);
      mockPaymentTransactionRepo.save.mockResolvedValue({ ...mockTransaction, status: PaymentTransactionStatus.SUCCESSFUL });
      
      const mockAuction = {
        id: auctionId,
        status: 'CLOSED',
        payment_status: 'PENDING',
      };
      mockAuctionRepo.findOne.mockResolvedValue(mockAuction);
      mockAuctionRepo.save.mockResolvedValue({ ...mockAuction, payment_status: 'PAID' });

      await service.handleSuccessfulPayment(clientReferenceId, paymentReferenceId, {});

      expect(mockPaymentTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentTransactionStatus.SUCCESSFUL,
          sikina_payment_reference_id: paymentReferenceId,
        }),
      );

      expect(mockAuctionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: 'PAID',
        }),
      );
    });

    it('should NOT mark auction as paid for BID_FEE payment type', async () => {
      const clientReferenceId = 'fee-bef09c86-af372c9d-1234567890';
      const paymentReferenceId = 'sikina-ref-456';
      const auctionId = 'bef09c86-21da-4db7-b02e-933f8fb83132';

      const mockTransaction = {
        id: 'txn-456',
        client_reference_id: clientReferenceId,
        auction_id: auctionId,
        user_id: 'user-456',
        payment_type: PaymentType.BID_FEE,
        status: PaymentTransactionStatus.PENDING,
      };
      mockPaymentTransactionRepo.findOne.mockResolvedValue(mockTransaction);
      mockPaymentTransactionRepo.save.mockResolvedValue({ ...mockTransaction, status: PaymentTransactionStatus.SUCCESSFUL });

      await service.handleSuccessfulPayment(clientReferenceId, paymentReferenceId, {});

      expect(mockPaymentTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentTransactionStatus.SUCCESSFUL,
        }),
      );

      expect(mockAuctionRepo.save).not.toHaveBeenCalled();
    });
  });
});