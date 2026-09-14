import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { WalletPinService } from '../src/modules/wallet/wallet-pin.service';
import { PrismaService } from '../src/prisma/prisma.service';

function createMockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('WalletPinService', () => {
  let service: WalletPinService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletPinService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WalletPinService>(WalletPinService);
  });

  it('sets a wallet PIN hash for a valid PIN', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1', wallet_pin_hash: null });
    mockPrisma.user.update.mockResolvedValue({});

    await service.setPin('user-1', '1234');

    expect(mockPrisma.user.update).toHaveBeenCalled();
    const updateCall = mockPrisma.user.update.mock.calls[0][0];
    expect(updateCall.data.wallet_pin_hash).toBeTruthy();
    expect(updateCall.data.wallet_pin_hash).not.toBe('1234');
  });

  it('locks the PIN after the max number of failed attempts', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      wallet_pin_hash: '$2a$10$hWH5vW8wM0tKQlASt1C2UeGW8Tn7n6IY0EjhWk1mBzQ0q0i8Y0V0C',
      pin_attempts: 4,
      pin_locked_until: null,
    });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await service.verifyPin('user-1', '0000');

    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(result.valid).toBe(false);
    expect(result.locked).toBe(true);
    expect(result.attemptsRemaining).toBe(0);
  });

  it('resets attempts after a successful verification', async () => {
    const validHash = await bcrypt.hash('1234', 10);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      wallet_pin_hash: validHash,
      pin_attempts: 2,
      pin_locked_until: null,
    });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await service.verifyPin('user-1', '1234');

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { pin_attempts: 0, pin_locked_until: null },
    });
    expect(result).toEqual({
      valid: true,
      attemptsRemaining: 5,
      locked: false,
      lockedUntil: null,
    });
  });
});