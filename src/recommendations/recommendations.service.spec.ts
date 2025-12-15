import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service';
import { RecommendationOrchestrator } from './orchestrator/recommendation.orchestrator';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let orchestrator: RecommendationOrchestrator;

  beforeEach(async () => {
    const mockOrchestrator = {
      contentBasedOnly: jest.fn(),
      collaborativeOnly: jest.fn(),
      hybrid: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: RecommendationOrchestrator, useValue: mockOrchestrator },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    orchestrator = module.get<RecommendationOrchestrator>(RecommendationOrchestrator);
  });

  it('should delegate content-based call to orchestrator', async () => {
    const spy = jest.spyOn(orchestrator, 'contentBasedOnly').mockResolvedValue([]);
    await service.getContentBasedRecommendations(1);
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('should delegate collaborative call to orchestrator', async () => {
    const spy = jest.spyOn(orchestrator, 'collaborativeOnly').mockResolvedValue([]);
    await service.getCollaborativeRecommendations(1);
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('should delegate hybrid call to orchestrator', async () => {
    const spy = jest
      .spyOn(orchestrator, 'hybrid')
      .mockResolvedValue([]);

    await service.getHybridRecommendations(1);

    expect(spy).toHaveBeenCalledWith(1);
  });
});
