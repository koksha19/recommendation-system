import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { RedisInterceptor } from '../redis/redis.interceptor';
import { RecommendationExplainService } from './explain/recommendation-explain.service';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let service: any;
  let explainService: any;

  beforeEach(async () => {
    const mockRecommendationsService = {
      getContentBasedRecommendations: jest.fn().mockResolvedValue(['Content']),
      getCollaborativeRecommendations: jest.fn().mockResolvedValue(['Collab']),
      getHybridRecommendations: jest.fn().mockResolvedValue(['Hybrid']),
    };

    const mockExplainService = {
      explain: jest.fn().mockResolvedValue({}),
    };

    const mockRedisInterceptor = {
      intercept: jest.fn((next) => next.handle()),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [
        { provide: RecommendationsService, useValue: mockRecommendationsService },
        { provide: RecommendationExplainService, useValue: mockExplainService },
      ],
    })
      .overrideInterceptor(RedisInterceptor)
      .useValue(mockRedisInterceptor)
      .compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
    service = module.get(RecommendationsService);
    explainService = module.get(RecommendationExplainService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call getContentBasedRecommendations', async () => {
    await controller.getContentBased(1);
    expect(service.getContentBasedRecommendations).toHaveBeenCalledWith(1);
  });

  it('getCollaborative should call service with userId', async () => {
    await controller.getCollaborative(456);
    expect(service.getCollaborativeRecommendations).toHaveBeenCalledWith(456);
  });

  it('getHybrid should call service with userId', async () => {
    await controller.getHybrid(789);
    expect(service.getHybridRecommendations).toHaveBeenCalledWith(789);
  });

  it('explainService should call explainService service', async () => {
    await controller.explain(1, 100);
    expect(explainService.explain).toHaveBeenCalledWith(1, 100);
  });
});
