import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { RedisCacheService } from './redis-cache.service';

type CachePolicy = {
  control: string;
  vary?: string;
  ttl?: number;
};

function normalizeRoutePath(baseUrl: string, routePath?: string): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const normalizedRoute = (routePath || '').replace(/^\/+/, '');
  return normalizedRoute ? `${normalizedBase}/${normalizedRoute}` : normalizedBase;
}

function resolveCachePolicy(request: Request): CachePolicy {
  if (request.method !== 'GET') {
    return { control: 'no-cache, no-store, must-revalidate' };
  }

  const fullPath = normalizeRoutePath(request.baseUrl || '', request.route?.path);

  if (fullPath.endsWith('/auctions/active')) {
    return { control: 'public, max-age=5, stale-while-revalidate=15', vary: 'Accept-Encoding', ttl: 5 };
  }

  if (fullPath.endsWith('/auctions/closed')) {
    return { control: 'public, max-age=30, stale-while-revalidate=60', vary: 'Accept-Encoding', ttl: 30 };
  }

  if (fullPath.endsWith('/products') || /\/products\/:id$/.test(fullPath)) {
    return { control: 'public, max-age=60, stale-while-revalidate=300', vary: 'Accept-Encoding', ttl: 60 };
  }

  return { control: 'no-cache, no-store, must-revalidate' };
}

function buildCacheKey(request: Request): string {
  const fullPath = normalizeRoutePath(request.baseUrl || '', request.route?.path);
  const queryString = Object.keys(request.query).length > 0
    ? `?${new URLSearchParams(request.query as Record<string, string>).toString()}`
    : '';
  return `cache:${request.method}:${fullPath}${queryString}`;
}

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(private readonly redisCacheService: RedisCacheService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const policy = resolveCachePolicy(request);

    const setCacheControlHeaders = () => {
      response.setHeader('Cache-Control', policy.control);
      if (policy.vary) {
        response.setHeader('Vary', policy.vary);
        response.removeHeader('Pragma');
        response.removeHeader('Expires');
        return;
      }

      response.setHeader('Pragma', 'no-cache');
      response.setHeader('Expires', '0');
    };

    if (request.method !== 'GET' || !policy.ttl) {
      return next.handle().pipe(tap(() => setCacheControlHeaders()));
    }

    const cacheKey = buildCacheKey(request);

    return new Observable<any>((subscriber) => {
      this.redisCacheService
        .get<any>(cacheKey)
        .then((cached) => {
          if (cached !== null) {
            setCacheControlHeaders();
            response.setHeader('X-Cache', 'HIT');
            subscriber.next(cached);
            subscriber.complete();
            return;
          }

          next
            .handle()
            .pipe(
              tap(() => {
                setCacheControlHeaders();
                response.setHeader('X-Cache', 'MISS');
              }),
              switchMap((data) => {
                this.redisCacheService.set(cacheKey, data, policy.ttl!).catch(() => {
                  // ignore cache write errors
                });
                return of(data);
              }),
              catchError((err) => {
                subscriber.error(err);
                return of(null);
              }),
            )
            .subscribe({
              next: (val) => subscriber.next(val),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
        })
        .catch(() => {
          next
            .handle()
            .pipe(
              tap(() => {
                setCacheControlHeaders();
                response.setHeader('X-Cache', 'MISS');
              }),
            )
            .subscribe({
              next: (val) => subscriber.next(val),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
        });
    });
  }
}
