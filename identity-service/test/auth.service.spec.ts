import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../src/modules/auth/auth.service';
import { SuperAppRegistry } from '../src/modules/auth/adapters/super-app-registry';
import { AuthTokenService } from '../src/modules/auth/auth-token.service';
import { AuthAuditService } from '../src/modules/auth/auth-audit.service';
import { PrismaService } from '../src/prisma/prisma.service';

function createMockPrisma() {
  return {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockTokenService: { generateTokens: jest.Mock; verifyRefreshToken: jest.Mock };
  let mockAuditService: { logFailedLogin: jest.Mock };

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockTokenService = {
      generateTokens: jest.fn().mockResolvedValue({ access_token: 'access', refresh_token: 'refresh' }),
      verifyRefreshToken: jest.fn(),
    };
    mockAuditService = {
      logFailedLogin: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SuperAppRegistry, useValue: { get: jest.fn() } },
        { provide: AuthTokenService, useValue: mockTokenService },
        { provide: AuthAuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('registers a new local user and stores a hashed refresh token', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      phone_number: '0911000000',
      role: 'user',
      wallet_balance: 0,
    });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await service.register({
      phone_number: '0911000000',
      full_name: 'Test User',
      password: 'password123',
    });

    expect(mockTokenService.generateTokens).toHaveBeenCalled();
    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalled();
    expect(result.access_token).toBe('access');
    expect(result.refresh_token).toBe('refresh');
  });

  it('rotates refresh tokens for a valid refresh request', async () => {
    const hashedRefresh = await bcrypt.hash('refresh-token', 10);
    mockTokenService.verifyRefreshToken.mockReturnValue({ sub: 'user-1' });
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      phone_number: '0911000000',
      role: 'user',
      wallet_balance: 50,
      hashed_refresh_token: hashedRefresh,
    });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await service.refreshToken('refresh-token');

    expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith('refresh-token');
    expect(mockTokenService.generateTokens).toHaveBeenCalled();
    expect(result.access_token).toBe('access');
    expect(result.refresh_token).toBe('refresh');
  });

  it('delegates failed login audit logging', async () => {
    await service.logFailedLogin('0911000000', '0911000000', 'invalid_credentials');

    expect(mockAuditService.logFailedLogin).toHaveBeenCalledWith(
      '0911000000',
      '0911000000',
      'invalid_credentials',
    );
  });
});