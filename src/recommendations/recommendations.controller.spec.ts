import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { RedisInterceptor } from '../redis/redis.interceptor';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let service: any;

  beforeEach(async () => {
    const mockRecommendationsService = {
      getContentBasedRecommendations: jest.fn().mockResolvedValue([]),
      getCollaborativeRecommendations: jest.fn().mockResolvedValue([]),
      getHybridRecommendations: jest.fn().mockResolvedValue([]),
    };

    const mockRedisInterceptor = {
      intercept: jest.fn((next) => next.handle()),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        { provide: RecommendationsService, useValue: mockRecommendationsService },
      ],
    })
      .overrideInterceptor(RedisInterceptor)
      .useValue(mockRedisInterceptor)
      .compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
    service = module.get(RecommendationsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getContentBasedRecommendations', async () => {
    await controller.getContentBased(1);
    expect(service.getContentBasedRecommendations).toHaveBeenCalledWith(1);
  });
});
