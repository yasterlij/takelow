import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Redis } from "ioredis";
import { InjectRedis } from "./redis.decorator";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(@InjectRedis() private readonly redis: Redis) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "takelow-jwt-secret",
    });
  }

  async validate(payload: {
    sub: string;
    phone: string;
    role: string;
    wallet_balance?: number;
  }): Promise<any> {
    if (!payload.sub) {
      throw new UnauthorizedException("Invalid token payload");
    }
    return {
      id: payload.sub,
      phone: payload.phone,
      role: payload.role,
      wallet_balance: payload.wallet_balance ?? 0,
    };
  }
}
