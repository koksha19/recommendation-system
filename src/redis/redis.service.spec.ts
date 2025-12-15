import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { ConfigService } from '@nestjs/config';

jest.mock('ioredis', () => {
  const RedisMock = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    status: 'ready',
  }));

  return {
    __esModule: true,
    default: RedisMock,
  };
});

describe('RedisService', () => {
  let service: RedisService;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'REDIS_HOST') return 'localhost';
        if (key === 'REDIS_PORT') return '6379';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);

    service.onModuleInit();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect on init', () => {
    expect((service as any).client).toBeDefined();
  });

  describe('get', () => {
    it('should return value if exists', async () => {
      (service as any).client.get.mockResolvedValue('some-value');
      expect(await service.get('key')).toBe('some-value');
    });

    it('should return null if not exists', async () => {
      (service as any).client.get.mockResolvedValue(null);
      expect(await service.get('key')).toBeNull();
    });

    it('should handle redis connection error gracefully', async () => {
      (service as any).client.get.mockRejectedValue(new Error('Connection lost'));
      const res = await service.get('key');
      expect(res).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      await service.set('key', 'val');
      expect((service as any).client.set).toHaveBeenCalledWith('key', 'val');
    });

    it('should set value WITH TTL', async () => {
      await service.set('key', 'val', 60);
      expect((service as any).client.set).toHaveBeenCalledWith('key', 'val', 'EX', 60);
    });

    it('should not throw if redis fails to set', async () => {
      (service as any).client.set.mockRejectedValue(new Error('Write failed'));
      await expect(service.set('key', 'val')).resolves.not.toThrow();
    });
  });
});
