import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
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

  @UseGuards(WebhookSignatureGuard)
  @Post('webhook/fintech')
  async handleFintechWebhook(@Body() payload: any) {
    await this.walletService.handleFintechWebhook(payload);
    return { received: true };
  }
}
