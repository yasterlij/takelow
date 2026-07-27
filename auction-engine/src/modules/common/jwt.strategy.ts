import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { Redis } from "ioredis";
import { InjectRedis } from "./redis.decorator";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("app.jwtSecret")!,
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

    const banned = await this.redis.sismember(
      "takelow:banned-users",
      payload.sub,
    );
    if (banned) {
      throw new UnauthorizedException("Account has been suspended");
    }

    return {
      id: payload.sub,
      phone: payload.phone,
      role: payload.role,
      wallet_balance: payload.wallet_balance ?? 0,
    };
  }
}
