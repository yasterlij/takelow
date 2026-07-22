import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum AuthProvider {
  LOCAL = 'LOCAL',
  TELEBIRR = 'TELEBIRR',
  BANKING_API = 'BANKING_API',
  SUPER_APP = 'SUPER_APP',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 20, nullable: true })
  phone_number: string;

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  password_hash: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  wallet_balance: number;

  @Column({ type: 'varchar', nullable: true })
  full_name: string;

  @Column({ type: 'varchar', nullable: true })
  avatar_url: string;

  @Column({ type: 'varchar', nullable: true })
  hashed_refresh_token: string;

  @Column({ type: 'enum', enum: AuthProvider, default: AuthProvider.LOCAL })
  auth_provider: AuthProvider;

  @Column({ type: 'varchar', nullable: true })
  provider_id: string;

  @Column({ type: 'boolean', default: false })
  phone_verified: boolean;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ type: 'boolean', default: false })
  is_banned: boolean;

  @Column({ type: 'varchar', length: 60, nullable: true })
  wallet_pin_hash: string;

  @Column({ type: 'int', default: 0 })
  pin_attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  pin_locked_until: Date;

  @Column({ type: 'varchar', nullable: true })
  fcm_token: string;

  @Column({ type: 'varchar', nullable: true })
  apns_token: string;

  @CreateDateColumn()
  created_at: Date;
}
