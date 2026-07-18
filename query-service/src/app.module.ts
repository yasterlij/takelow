import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { typeOrmConfig } from './config/typeorm.config';
import { appConfig } from './config/env.config';
import { validate } from './config/env.validation';
import { AuctionsModule } from './modules/auctions/auctions.module';
import { ProductsModule } from './modules/products/products.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthController } from './modules/common/health.controller';
import { JwtStrategy } from './modules/common/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validate,
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'takelow-jwt-secret',
      signOptions: { expiresIn: '15m' },
    }),
    AuctionsModule,
    ProductsModule,
    FavoritesModule,
    AdminModule,
  ],
  controllers: [HealthController],
  providers: [JwtStrategy],
})
export class AppModule {}
