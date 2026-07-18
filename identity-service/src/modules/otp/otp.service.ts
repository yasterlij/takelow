import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Redis } from 'ioredis';
import { Inject } from '@nestjs/common';
import { Otp } from './entities/otp.entity';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(Otp)
    private otpRepository: Repository<Otp>,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  async generateOtp(phoneNumber: string): Promise<{ expires_in: number }> {
    const rateKey = `otp:rate:${phoneNumber}`;
    const attempts = await this.redis.incr(rateKey);
    if (attempts === 1) {
      await this.redis.pexpire(rateKey, 60000);
    }
    if (attempts > 3) {
      throw new BadRequestException('Too many OTP requests. Wait 60 seconds.');
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.otpRepository.upsert(
      { phone_number: phoneNumber, code, expires_at: expiresAt, verified: false },
      ['phone_number'],
    );

    this.logger.log(`OTP for ${phoneNumber}: ${code}`);

    return { expires_in: 300 };
  }

  async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    const otp = await this.otpRepository.findOne({
      where: { phone_number: phoneNumber, code, verified: false },
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    if (new Date() > otp.expires_at) {
      await this.otpRepository.delete({ id: otp.id });
      throw new BadRequestException('OTP has expired');
    }

    otp.verified = true;
    await this.otpRepository.save(otp);

    return true;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOtps(): Promise<void> {
    const result = await this.otpRepository.delete({
      expires_at: LessThan(new Date()),
    });
    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired OTPs`);
    }
  }
}
