import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Optional() private readonly jwtService?: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException("No auth token");
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    try {
      if (!this.jwtService) {
        return true;
      }
      const payload = await this.jwtService.verifyAsync(token);
      request.user = {
        id: payload.sub,
        phone: payload.phone,
        role: payload.role,
        wallet_balance: payload.wallet_balance,
        is_banned: payload.is_banned,
        tc_accepted: payload.tc_accepted,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
