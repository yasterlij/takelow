import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController, AuditController } from './admin.controller';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';
import { User } from '../auth/entities/user.entity';
import { Transaction } from '../wallet/entities/transaction.entity';
import { AuditLog } from './entities/audit-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Transaction, AuditLog])],
  controllers: [AdminController, AuditController],
  providers: [AdminService, AuditService],
})
export class AdminModule {}