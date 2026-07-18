import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-webhook-signature'];
    const timestamp = request.headers['x-webhook-timestamp'];

    if (!signature || !timestamp) {
      throw new ForbiddenException('Missing webhook signature headers');
    }

    const now = Math.floor(Date.now() / 1000);
    if (now - parseInt(timestamp, 10) > 300) {
      throw new ForbiddenException('Webhook timestamp expired');
    }

    const payload = JSON.stringify(request.body);
    const secret = process.env.FINTECH_WEBHOOK_SECRET || 'takelow-webhook-secret';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      throw new ForbiddenException('Invalid webhook signature');
    }

    return true;
  }
}
