import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Query,
  HttpCode,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BetterAuthGuard } from '../../auth/better-auth.guard';
import { InternalAuthGuard } from '../common/internal-auth.guard';
import { AuthOrInternalGuard } from '../common/auth-or-internal.guard';
import { WalletService } from './wallet.service';
import { WalletPinService } from './wallet-pin.service';
import { WebhookSignatureGuard } from './webhook.guard';
import { DepositDto } from './dto/deposit.dto';
import { DeductFeeDto } from './dto/deduct-fee.dto';
import { FintechWebhookDto } from './dto/fintech-webhook.dto';
import { SetPinDto } from './dto/set-pin.dto';
import { VerifyPinDto } from './dto/verify-pin.dto';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(
    private walletService: WalletService,
    private walletPinService: WalletPinService,
  ) {}

  @UseGuards(BetterAuthGuard)
  @Get('balance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet balance' })
  async getBalance(@Req() req: any) {
    const balance = await this.walletService.getBalance(req.user.id);
    return { balance };
  }

  @UseGuards(BetterAuthGuard)
  @Get('transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet transactions' })
  async getTransactions(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(
      req.user.id,
      Math.max(1, parseInt(page || '1', 10)),
      Math.min(100, Math.max(1, parseInt(limit || '20', 10))),
    );
  }

  @UseGuards(BetterAuthGuard)
  @Post('deposit')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deposit to wallet' })
  async deposit(@Req() req: any, @Body() dto: DepositDto) {
    const user = await this.walletService.deposit(req.user.id, dto.amount, `deposit_${Date.now()}`);
    return { balance: Number(user.wallet_balance) };
  }

  @UseGuards(WebhookSignatureGuard)
  @Post('webhook/fintech')
  @ApiOperation({ summary: 'Handle fintech webhook' })
  async handleFintechWebhook(@Body() payload: FintechWebhookDto) {
    await this.walletService.handleFintechWebhook(payload);
    return { received: true };
  }

  @UseGuards(BetterAuthGuard)
  @Post('set-pin')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set wallet PIN' })
  async setPin(@Req() req: any, @Body() dto: SetPinDto) {
    await this.walletPinService.setPin(req.user.id, dto.pin);
    return { set: true };
  }

  @UseGuards(BetterAuthGuard)
  @Post('verify-pin')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify wallet PIN' })
  async verifyPin(@Req() req: any, @Body() dto: VerifyPinDto) {
    const result = await this.walletPinService.verifyPin(req.user.id, dto.pin);
    return result;
  }

  @UseGuards(BetterAuthGuard)
  @Get('has-pin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if wallet PIN is set' })
  async hasPin(@Req() req: any) {
    const hasPin = await this.walletPinService.hasPin(req.user.id);
    return { hasPin };
  }

  @UseGuards(BetterAuthGuard)
  @Get('pin-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet PIN status' })
  async getPinStatus(@Req() req: any) {
    return this.walletPinService.getPinStatus(req.user.id);
  }

  @UseGuards(AuthOrInternalGuard)
  @Post('deduct-fee')
  @HttpCode(200)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deduct bid fee from wallet' })
  async deductFee(@Req() req: any, @Body() dto: DeductFeeDto) {
    const { user_id: userId, amount } = dto;
    if (!userId || !amount || amount <= 0) {
      throw new BadRequestException('Invalid user_id or amount');
    }
    if (req.user && req.user.id !== userId && req.user.role !== 'admin') {
      throw new UnauthorizedException('You can only deduct fees from your own account');
    }
    await this.walletService.deductBidFee(userId, amount);
    return { deducted: true };
  }

  @UseGuards(BetterAuthGuard)
  @Get('user/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve user name by ID' })
  async resolveUserName(@Param('id') id: string) {
    const user = await this.walletService.resolveUser(id);
    if (!user) throw new NotFoundException('User not found');
    return { id: user.id, full_name: user.full_name, phone_number: user.phone_number };
  }

  @UseGuards(InternalAuthGuard)
  @Get('user/:id/internal')
  @ApiOperation({ summary: 'Resolve user name by ID (internal)' })
  async resolveUserNameInternal(@Param('id') id: string) {
    const user = await this.walletService.resolveUser(id);
    if (!user) throw new NotFoundException('User not found');
    return { id: user.id, full_name: user.full_name, phone_number: user.phone_number };
  }
}
