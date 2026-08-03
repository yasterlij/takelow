import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthAuditService } from './auth-audit.service';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { User } from './entities/user.entity';
import { LocalStrategy } from './strategies/local.strategy';
import { TeleBirrStrategy } from './strategies/telebirr.strategy';
import { BankingStrategy } from './strategies/banking.strategy';
import { JwtStrategy } from './jwt.strategy';
import { SuperAppRegistry } from './adapters/super-app-registry';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwtSecret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    AuthAuditService,
    LocalStrategy,
    TeleBirrStrategy,
    BankingStrategy,
    JwtStrategy,
    SuperAppRegistry,
  ],
  exports: [SuperAppRegistry, AuthTokenService, AuthAuditService],
})
export class AuthModule {}
