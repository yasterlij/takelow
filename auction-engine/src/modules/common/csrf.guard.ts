import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }

    const token = request.headers['x-csrf-token'];
    const cookieToken = request.cookies?.['csrf-token'];

    if (!token || !cookieToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    const expected = crypto
      .createHmac('sha256', process.env.CSRF_SECRET || 'takelow-csrf-secret')
      .update(cookieToken)
      .digest('hex');

    if (token !== expected) {
      throw new ForbiddenException('CSRF token mismatch');
    }

    return true;
  }
}
