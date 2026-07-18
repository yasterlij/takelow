import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { OtpService } from './otp.service';

@Controller('otp')
export class OtpController {
  constructor(private otpService: OtpService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body('phone_number') phoneNumber: string) {
    return this.otpService.generateOtp(phoneNumber);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body('phone_number') phoneNumber: string,
    @Body('code') code: string,
  ) {
    await this.otpService.verifyOtp(phoneNumber, code);
    return { verified: true };
  }
}
