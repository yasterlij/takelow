import {
  Controller,
  Get,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { AdminStatsService } from './admin-stats.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private statsService: AdminStatsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get admin stats' })
  async getStats() {
    return this.statsService.getStats();
  }

  @Get('analytics/revenue-forecast')
  @ApiOperation({ summary: 'Get revenue forecast' })
  async getRevenueForecast(
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    return this.statsService.getRevenueForecast(days);
  }
}
