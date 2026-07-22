import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  HttpCode,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WalletService } from './wallet.service';
import { WebhookSignatureGuard } from './webhook.guard';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('balance')
  async getBalance(@Req() req: any) {
    const balance = await this.walletService.getBalance(req.user.id);
    return { balance };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('transactions')
  async getTransactions(@Req() req: any) {
    return this.walletService.getTransactions(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('deposit')
  @HttpCode(200)
  async deposit(@Req() req: any, @Body('amount') amount: number) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    const user = await this.walletService.deposit(req.user.id, amount, `deposit_${Date.now()}`);
    return { balance: Number(user.wallet_balance) };
  }

  @UseGuards(WebhookSignatureGuard)
  @Post('webhook/fintech')
  async handleFintechWebhook(@Body() payload: any) {
    await this.walletService.handleFintechWebhook(payload);
    return { received: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('set-pin')
  @HttpCode(200)
  async setPin(@Req() req: any, @Body('pin') pin: string) {
    if (!pin) throw new BadRequestException('PIN is required');
    await this.walletService.setPin(req.user.id, pin);
    return { set: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('verify-pin')
  @HttpCode(200)
  async verifyPin(@Req() req: any, @Body('pin') pin: string) {
    if (!pin) throw new BadRequestException('PIN is required');
    const result = await this.walletService.verifyPin(req.user.id, pin);
    return result;
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('has-pin')
  async hasPin(@Req() req: any) {
    const hasPin = await this.walletService.hasPin(req.user.id);
    return { hasPin };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('pin-status')
  async getPinStatus(@Req() req: any) {
    return this.walletService.getPinStatus(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('deduct-fee')
  @HttpCode(200)
  async deductFee(@Body('user_id') userId: string, @Body('amount') amount: number) {
    if (!userId || !amount || amount <= 0) {
      throw new BadRequestException('Invalid user_id or amount');
    }
    await this.walletService.deductBidFee(userId, amount);
    return { deducted: true };
  }

  @Get('user/:id')
  async resolveUserName(@Param('id') id: string) {
    const user = await this.walletService.resolveUser(id);
    if (!user) throw new NotFoundException('User not found');
    return { id: user.id, full_name: user.full_name, phone_number: user.phone_number };
  }
}
