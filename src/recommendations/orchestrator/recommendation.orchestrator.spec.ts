import { Test } from '@nestjs/testing';
import { RecommendationOrchestrator } from './recommendation.orchestrator';
import { CONFIG } from '../../common/constants/recommendation.constants';
import { ContentBasedStrategy } from '../strategies/content-based.strategy';
import { CollaborativeStrategy } from '../strategies/collaborative.strategy';
import { PopularityStrategy } from '../strategies/popularity.strategy';

describe('RecommendationOrchestrator', () => {
  let orchestrator: RecommendationOrchestrator;
  let contentStrategy: any;
  let collabStrategy: any;
  let popularityStrategy: any;

  beforeEach(async () => {
    contentStrategy = { recommend: jest.fn().mockResolvedValue([]) };
    collabStrategy = { recommend: jest.fn().mockResolvedValue([]) };
    popularityStrategy = {
      recommend: jest.fn().mockResolvedValue([
        { movie: { movieId: 999 }, score: 1, strategy: 'Popularity' }
      ])
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        RecommendationOrchestrator,
        {
          provide: ContentBasedStrategy,
          useValue: contentStrategy,
        },
        {
          provide: CollaborativeStrategy,
          useValue: collabStrategy
        },
        {
          provide: PopularityStrategy,
          useValue: popularityStrategy
        },
      ],
    }).compile();

    orchestrator = moduleRef.get(RecommendationOrchestrator);
  });

  it('should fallback to popularity for cold start (no content/collab results)', async () => {
    const result = await orchestrator.hybrid(1);

    expect(result.length).toBe(1);
    expect(result[0].strategy).toBe('Popularity');
  });

  it('contentBasedOnly should proxy to ContentBasedStrategy', async () => {
    contentStrategy.recommend.mockResolvedValue([{ movie: { movieId: 1 }, score: 0.9 }]);

    const res = await orchestrator.contentBasedOnly(1);

    expect(contentStrategy.recommend).toHaveBeenCalledWith(1);
    expect(res).toHaveLength(1);
  });

  it('collaborativeOnly should proxy to CollaborativeStrategy', async () => {
    collabStrategy.recommend.mockResolvedValue([{ movie: { movieId: 2 }, score: 4.5 }]);

    const res = await orchestrator.collaborativeOnly(1);

    expect(collabStrategy.recommend).toHaveBeenCalledWith(1);
    expect(res[0].movie.movieId).toBe(2);
  });

  it('Hybrid: alpha = 1 should use only content scores', async () => {
    const movie = { movieId: 1 };

    contentStrategy.recommend.mockResolvedValue([
      { movie, score: 0.9, strategy: 'Content-Based' }
    ]);
    collabStrategy.recommend.mockResolvedValue([
      { movie, score: 5, strategy: 'Collaborative-Filtering' }
    ]);
    popularityStrategy.recommend.mockResolvedValue([]);

    const res = await orchestrator.hybrid(1, 10, 1);

    expect(res[0].score).toBeCloseTo(0.9);
  });

  it('Hybrid: alpha = 0 should use only collaborative scores', async () => {
    const movie = { movieId: 1 };

    contentStrategy.recommend.mockResolvedValue([
      { movie, score: 0.9 }
    ]);
    collabStrategy.recommend.mockResolvedValue([
      { movie, score: 5 }
    ]);
    popularityStrategy.recommend.mockResolvedValue([]);

    const res = await orchestrator.hybrid(1, 10, 0);

    expect(res[0].score).toBeCloseTo(1.0);
  });

  it('Hybrid: should merge content + collab + popularity for same movie', async () => {
    const movie = { movieId: 42 };

    contentStrategy.recommend.mockResolvedValue([
      { movie, score: 0.5 }
    ]);
    collabStrategy.recommend.mockResolvedValue([
      { movie, score: 5 } // → 1
    ]);
    popularityStrategy.recommend.mockResolvedValue([
      { movie, score: 0.8 }
    ]);

    // alpha = 0.6
    // content: 0.5 * 0.6 = 0.3
    // collab: 1 * 0.4 = 0.4
    // popularity: 0.8 * 0.2 = 0.16
    // total = 0.86
    const res = await orchestrator.hybrid(1, 10, 0.6);

    expect(res[0].score).toBeCloseTo(0.86);
  });

  it('Hybrid: popularity should break ties between equal content/collab scores', async () => {
    const movieA = { movieId: 1 };
    const movieB = { movieId: 2 };

    contentStrategy.recommend.mockResolvedValue([
      { movie: movieA, score: 0.5 },
      { movie: movieB, score: 0.5 }
    ]);

    collabStrategy.recommend.mockResolvedValue([]);

    popularityStrategy.recommend.mockResolvedValue([
      { movie: movieA, score: 1 },
      { movie: movieB, score: 0.5 }
    ]);

    const res = await orchestrator.hybrid(1);

    expect(res[0].movie.movieId).toBe(1);
  });

  it('Hybrid: all results must have strategy = Hybrid', async () => {
    contentStrategy.recommend.mockResolvedValue([
      { movie: { movieId: 1 }, score: 0.9 }
    ]);

    collabStrategy.recommend.mockResolvedValue([]);
    popularityStrategy.recommend.mockResolvedValue([]);

    const res = await orchestrator.hybrid(1);

    res.forEach(r => {
      expect(r.strategy).toBe('Hybrid');
    });
  });

  it('Hybrid: should prioritize Content if Collaborative returns nothing', async () => {
    contentStrategy.recommend.mockResolvedValue([
      { movie: { movieId: 1 }, score: 0.8, strategy: 'Content-Based' }
    ]);
    collabStrategy.recommend.mockResolvedValue([]);
    popularityStrategy.recommend.mockResolvedValue([]);

    const res = await orchestrator.hybrid(1);

    expect(res.length).toBe(1);
    // Formula: score * alpha
    expect(res[0].score).toBe(0.8 * CONFIG.HYBRID_WEIGHT_ALPHA);
    expect(res[0].strategy).toBe('Hybrid');
  });

  it('Hybrid: should calculate weighted average correctly', async () => {
    const movie = { movieId: 1 };

    // Content score: 0.5
    contentStrategy.recommend.mockResolvedValue([
      { movie, score: 0.5, strategy: 'Content-Based' }
    ]);

    // Collab score: 5.0 (This will be normalized by /5 inside orchestrator) -> 1.0
    collabStrategy.recommend.mockResolvedValue([
      { movie, score: 5.0, strategy: 'Collaborative-Filtering' }
    ]);

    popularityStrategy.recommend.mockResolvedValue([]);

    // Alpha = 0.6
    // (0.5 * 0.6) + ((5.0/5.0) * 0.4) = 0.3 + 0.4 = 0.7
    const res = await orchestrator.hybrid(1, 10, 0.6);

    expect(res[0].score).toBeCloseTo(0.7);
  });

  it('Scenario: сontent loves it but friends hate it', async () => {
    const movie = { movieId: 666 };

    contentStrategy.recommend.mockResolvedValue([
      { movie, score: 1.0, strategy: 'Content-Based' }
    ]);

    collabStrategy.recommend.mockResolvedValue([
      { movie, score: 1.0, strategy: 'Collaborative-Filtering' }
    ]);

    popularityStrategy.recommend.mockResolvedValue([]);

    const res = await orchestrator.hybrid(1, 10, 0.5);

    expect(res[0].score).toBeCloseTo(0.6);
  });

  it('Hybrid: should respect limit', async () => {
    contentStrategy.recommend.mockResolvedValue([
      { movie: { movieId: 1 }, score: 0.9 },
      { movie: { movieId: 2 }, score: 0.8 },
      { movie: { movieId: 3 }, score: 0.7 },
    ]);

    collabStrategy.recommend.mockResolvedValue([]);
    popularityStrategy.recommend.mockResolvedValue([]);

    const res = await orchestrator.hybrid(1, 2);

    expect(res).toHaveLength(2);
  });
});
