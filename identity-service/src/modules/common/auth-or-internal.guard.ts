import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import * as crypto from 'crypto';

@Injectable()
export class AuthOrInternalGuard extends AuthGuard('jwt') {
  constructor(private configService: ConfigService) {
    super();
  }

  private matchesInternalKey(apiKey: unknown, expected: string | undefined): boolean {
    if (!expected || !apiKey) return false;
    const a = Buffer.from(String(apiKey));
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-internal-api-key'];
    const expected = this.configService.get<string>('app.internalApiKey');

    if (this.matchesInternalKey(apiKey, expected)) {
      return true;
    }

    return (super.canActivate(context) as Promise<boolean>);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-internal-api-key'];
    const expected = this.configService.get<string>('app.internalApiKey');

    if (this.matchesInternalKey(apiKey, expected)) {
      return null;
    }

    return super.handleRequest(err, user, info, context);
  }
}
