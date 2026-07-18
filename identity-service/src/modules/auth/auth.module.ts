import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
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
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'takelow-jwt-secret',
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    TeleBirrStrategy,
    BankingStrategy,
    JwtStrategy,
    SuperAppRegistry,
  ],
  exports: [SuperAppRegistry],
})
export class AuthModule {}
