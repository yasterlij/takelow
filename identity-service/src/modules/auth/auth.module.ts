import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthAuditService } from './auth-audit.service';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { TcService } from './tc.service';
import { TcController } from './tc.controller';
import { SuperAppRegistry } from './adapters/super-app-registry';
import { BetterAuthModule } from '../../auth/better-auth.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('app.jwtSecret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    BetterAuthModule,
  ],
  controllers: [AuthController, TcController],
  providers: [
    AuthService,
    AuthTokenService,
    AuthAuditService,
    TcService,
    SuperAppRegistry,
  ],
  exports: [SuperAppRegistry, AuthTokenService, AuthAuditService, TcService],
})
export class AuthModule {}