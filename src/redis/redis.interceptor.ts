import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Request } from 'express';
import { RedisService } from './redis.service';

@Injectable()
export class RedisInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RedisInterceptor.name);

  constructor(private readonly redisService: RedisService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.url;

    try {
      const cachedResponse = await this.redisService.get(key);

      if (cachedResponse) {
        this.logger.log(`dfServing from Cache: ${key}`);

        return of(JSON.parse(cachedResponse));
      }
    } catch (err) {
      this.logger.error('Redis get error', err);
    }

    return next.handle().pipe(
      mergeMap(async (response: unknown) => {
        try {
          this.logger.log(`💾 Caching result for: ${key}`);

          await this.redisService.set(key, JSON.stringify(response), 60);
        } catch (err) {
          this.logger.error('Redis set error', err);
        }

        return response;
      }),
    );
  }
}
