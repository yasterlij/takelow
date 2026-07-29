import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../modules/auth/entities/user.entity';
import { Transaction } from '../modules/wallet/entities/transaction.entity';
import { Otp } from '../modules/otp/entities/otp.entity';
import { AuditLog } from '../modules/admin/entities/audit-log.entity';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://admin:secret@localhost:5432/takelow_db',
  entities: [User, Transaction, Otp, AuditLog],
  autoLoadEntities: true,
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  extra: {
    max: 50,
    idleTimeoutMillis: 30000,
  },
};
