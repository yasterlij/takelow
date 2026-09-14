import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminStatsService } from './admin-stats.service';
import { SettlementService } from './settlement.service';
import { SettlementController } from './settlement.controller';
import { WinnerManagementService } from './winner-management.service';
import { WinnerManagementController } from './winner-management.controller';

@Module({
  controllers: [
    AdminController,
    SettlementController,
    WinnerManagementController,
  ],
  providers: [
    AdminStatsService,
    SettlementService,
    WinnerManagementService,
  ],
})
export class AdminModule {}
