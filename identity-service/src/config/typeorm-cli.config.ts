import { DataSource } from 'typeorm';
import { User } from '../modules/auth/entities/user.entity';
import { Transaction } from '../modules/wallet/entities/transaction.entity';
import { Otp } from '../modules/otp/entities/otp.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://admin:secret@localhost:5432/takelow_db',
  entities: [User, Transaction, Otp],
  migrations: ['src/migrations/*.ts'],
  logging: true,
});
