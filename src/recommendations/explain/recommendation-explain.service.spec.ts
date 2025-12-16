import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationExplainService } from './recommendation-explain.service';
import { ContentBasedStrategy } from '../strategies/content-based.strategy';
import { CollaborativeStrategy } from '../strategies/collaborative.strategy';
import { CONFIG } from '../../common/constants/recommendation.constants';

describe('RecommendationExplainService', () => {
  let explainService: RecommendationExplainService;
  let contentBased: any;
  let collaborative: any;

  const createMovie = (id: number, genres: string[]) => ({
    movieId: id, title: 'Test', genres
  });

  beforeEach(async () => {
    contentBased = { recommend: jest.fn() };
    collaborative = { recommend: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationExplainService,
        { provide: ContentBasedStrategy, useValue: contentBased },
        { provide: CollaborativeStrategy, useValue: collaborative },
      ],
    }).compile();

    explainService = module.get<RecommendationExplainService>(RecommendationExplainService);
  });

  it('should explain both content and collaborative parts', async () => {
    jest.spyOn(contentBased, 'recommend').mockResolvedValue([
      {
        movie: createMovie(1, ['Action']),
        score: 0.6,
        strategy: 'Content-Based',
      },
    ]);

    jest.spyOn(collaborative, 'recommend').mockResolvedValue([
      {
        movie: createMovie(1, ['Action']),
        score: 5,
        strategy: 'Collaborative-Filtering',
      },
    ]);

    const res = await explainService.explain(1, 1);

    expect(res.movieId).toBe(1);
    expect(res.contentBased).toBeDefined();
    expect(res.contentBased?.score).toBe(0.6);

    expect(res.collaborative).toBeDefined();
    expect(res.collaborative?.predictedRating).toBe(5);

    const expectedScore =
      0.6 * CONFIG.HYBRID_WEIGHT_ALPHA +
      (5 / 5) * (1 - CONFIG.HYBRID_WEIGHT_ALPHA);

    expect(res.finalScore).toBeCloseTo(expectedScore);
  });

  it('should explain content-only recommendation', async () => {
    jest.spyOn(contentBased, 'recommend').mockResolvedValue([
      {
        movie: createMovie(1, []),
        score: 0.7,
        strategy: 'Content-Based',
      },
    ]);

    jest.spyOn(collaborative, 'recommend').mockResolvedValue([]);

    const res = await explainService.explain(1, 1);

    expect(res.contentBased).toBeDefined();
    expect(res.collaborative).toBeNull();
    expect(res.finalScore).toBeCloseTo(0.7 * CONFIG.HYBRID_WEIGHT_ALPHA);
  });

  it('should explain collaborative-only recommendation', async () => {
    contentBased.recommend.mockResolvedValue([]);

    collaborative.recommend.mockResolvedValue([
      {
        movie: createMovie(1, []),
        score: 4,
        strategy: 'Collaborative-Filtering',
      },
    ]);

    const res = await explainService.explain(1, 1);

    expect(res.contentBased).toBeNull();
    expect(res.collaborative).toBeDefined();

    const expected =
      (4 / 5) * (1 - CONFIG.HYBRID_WEIGHT_ALPHA);

    expect(res.finalScore).toBeCloseTo(expected);
  });

  it('should return zero explanation if movie not recommended by any strategy', async () => {
    contentBased.recommend.mockResolvedValue([]);
    collaborative.recommend.mockResolvedValue([]);

    const res = await explainService.explain(1, 999);

    expect(res.finalScore).toBe(0);
    expect(res.contentBased).toBeNull();
    expect(res.collaborative).toBeNull();
  });
});
