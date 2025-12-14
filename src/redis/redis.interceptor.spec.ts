import { RedisInterceptor } from './redis.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('RedisInterceptor', () => {
  let interceptor: RedisInterceptor;
  let redisService: any;

  beforeEach(() => {
    redisService = {
      get: jest.fn(),
      set: jest.fn(),
    };
    interceptor = new RedisInterceptor(redisService);
  });

  const createMockContext = (url: string) => ({
    switchToHttp: () => ({
      getRequest: () => ({ url }),
    }),
  } as unknown as ExecutionContext);

  const mockCallHandler: CallHandler = {
    handle: () => of({ data: 'fresh data' }),
  };

  it('should return cached data if key exists in Redis', async () => {
    redisService.get.mockResolvedValue(JSON.stringify({ data: 'cached data' }));
    const context = createMockContext('/api/test');

    const resultObservable = await interceptor.intercept(context, mockCallHandler);

    resultObservable.subscribe(result => {
      expect(result).toEqual({ data: 'cached data' });
      expect(redisService.get).toHaveBeenCalledWith('/api/test');
    });
  });

  it('should call handler and set cache if key does missing', async () => {
    redisService.get.mockResolvedValue(null);
    const context = createMockContext('/api/test');

    const resultObservable = await interceptor.intercept(context, mockCallHandler);

    resultObservable.subscribe(result => {
      expect(result).toEqual({ data: 'fresh data' });
      expect(redisService.set).toHaveBeenCalledWith('/api/test', JSON.stringify({ data: 'fresh data' }), 60);
    });
  });
});
