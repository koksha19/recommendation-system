import { Test, TestingModule } from '@nestjs/testing';
import { ContentBasedStrategy } from './content-based.strategy';
import { RatingsRepository } from '../../ratings/ratings.repository';
import { ContentRepository } from '../../content/content.repository';
import { MathService } from '../../common/math/math.service';
import { CONFIG } from '../../common/constants/recommendation.constants';

const createRating = (userId: number, movieId: number, rating: number) => ({
  userId, movieId, rating, timestamp: 123
});
const createMovie = (movieId: number, genres: string[]) => ({
  movieId, title: `Movie ${movieId}`, genres
});

describe('ContentBasedStrategy', () => {
  let strategy: ContentBasedStrategy;
  let ratingsRepo: any;
  let contentRepo: any;
  let mathService: any;

  beforeEach(async () => {
    ratingsRepo = { findByUser: jest.fn() };
    contentRepo = {
      findOne: jest.fn(),
      getGenres: jest.fn().mockResolvedValue(['Action', 'Comedy', 'Drama']),
      findCandidates: jest.fn()
    };

    mathService = {
      cosineSimilarity: jest.fn((vecA, vecB) => {
        return JSON.stringify(vecA) === JSON.stringify(vecB) ? 1.0 : 0;
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentBasedStrategy,
        { provide: RatingsRepository, useValue: ratingsRepo },
        { provide: ContentRepository, useValue: contentRepo },
        { provide: MathService, useValue: mathService },
      ],
    }).compile();

    strategy = module.get<ContentBasedStrategy>(ContentBasedStrategy);
  });

  it('should return empty if user has no ratings at all', async () => {
    ratingsRepo.findByUser.mockResolvedValue([]);

    const res = await strategy.recommend(1);

    expect(res).toEqual([]);
    expect(contentRepo.findCandidates).not.toHaveBeenCalled();
  });

  it('should ignore liked movies that are missing in content repository', async () => {
    ratingsRepo.findByUser.mockResolvedValue([
      createRating(1, 10, 5),
    ]);

    contentRepo.findOne.mockResolvedValue(null);
    contentRepo.findCandidates.mockResolvedValue([]);

    const res = await strategy.recommend(1);

    expect(res).toEqual([]);
  });

  it('should ignore movies with similarity below MIN_SIMILARITY_SCORE', async () => {
    ratingsRepo.findByUser.mockResolvedValue([
      createRating(1, 10, 5),
    ]);

    contentRepo.findOne.mockResolvedValue(
      createMovie(10, ['Action'])
    );

    contentRepo.findCandidates.mockResolvedValue([
      createMovie(20, ['Drama']),
    ]);

    mathService.cosineSimilarity.mockReturnValue(0);

    const res = await strategy.recommend(1);
    expect(res).toEqual([]);
  });

  it('should average user profile vector correctly', async () => {
    ratingsRepo.findByUser.mockResolvedValue([
      createRating(1, 10, 5),
      createRating(1, 11, 5),
    ]);

    contentRepo.findOne.mockImplementation((id) =>
      id === 10
        ? createMovie(10, ['Action'])
        : createMovie(11, ['Comedy'])
    );

    contentRepo.findCandidates.mockResolvedValue([
      createMovie(20, ['Action', 'Comedy']),
    ]);

    mathService.cosineSimilarity.mockReturnValue(1.0);

    const res = await strategy.recommend(1);
    expect(res[0].score).toBeCloseTo(1.0);
    expect(mathService.cosineSimilarity).toHaveBeenCalled();
  });

  it('should handle empty candidate list gracefully', async () => {
    ratingsRepo.findByUser.mockResolvedValue([
      createRating(1, 10, 5),
    ]);

    contentRepo.findOne.mockResolvedValue(
      createMovie(10, ['Action'])
    );
    contentRepo.findCandidates.mockResolvedValue([]);

    const res = await strategy.recommend(1);
    expect(res).toEqual([]);
  });

  it('Scenario: The "Action" Fan (Pure Genre Match)', async () => {
    // User loves Action (5 stars), hates Drama (1 star)
    ratingsRepo.findByUser.mockResolvedValue([
      createRating(1, 10, 5),
      createRating(1, 11, 1),
    ]);

    contentRepo.findOne.mockImplementation((id) => {
      if(id===10) return createMovie(10, ['Action']);
      if(id===11) return createMovie(11, ['Drama']);
      return null;
    });

    const candidates = [
      createMovie(20, ['Action']),
      createMovie(21, ['Action', 'Comedy']),
      createMovie(22, ['Drama']),
    ];
    contentRepo.findCandidates.mockResolvedValue(candidates);

    const res = await strategy.recommend(1);

    expect(res.length).toBeGreaterThan(0);
    expect(res[0].movie.movieId).toBe(20);
    expect(res[0].score).toBeCloseTo(1.0);
  });

  it('Scenario: User with minimal positive ratings (Threshold check)', async () => {
    // User rated everything 3.0 (below threshold 4.0)
    ratingsRepo.findByUser.mockResolvedValue([
      createRating(1, 10, 3.5),
      createRating(1, 11, 3.9),
    ]);

    const res = await strategy.recommend(1);
    expect(res).toEqual([]);
  });

  it('Scenario: User likes everything (Broad taste)', async () => {
    ratingsRepo.findByUser.mockResolvedValue([
      createRating(1, 10, 5), // Action
      createRating(1, 11, 5), // Comedy
    ]);

    contentRepo.findOne.mockImplementation((id) => {
      if(id===10) return createMovie(10, ['Action']);
      if(id===11) return createMovie(11, ['Comedy']);
    });

    contentRepo.findCandidates.mockResolvedValue([
      createMovie(20, ['Action', 'Comedy']), // Should be high score
      createMovie(21, ['Horror']), // Should be 0
    ]);

    mathService.cosineSimilarity.mockReturnValue(1.0);

    const res = await strategy.recommend(1);
    expect(res[0].movie.movieId).toBe(20);
    expect(res[0].score).toBeCloseTo(1.0); // (0.5+0.5) dot (1+1) normalized
  });

  it('Scenario: User hates everything', async () => {
    const badRatings = Array.from({ length: 10 }, (_, i) =>
      createRating(1, i, 1)
    );

    ratingsRepo.findByUser.mockResolvedValue(badRatings);

    const res = await strategy.recommend(1);

    expect(res).toEqual([]);
  });

  it('should correctly average genre weights across liked movies', async () => {
    ratingsRepo.findByUser.mockResolvedValue([
      createRating(1, 10, 5),
      createRating(1, 11, 5),
      createRating(1, 12, 5),
    ]);

    contentRepo.findOne.mockImplementation((id) => {
      if (id === 10) return createMovie(10, ['Action']);
      if (id === 11) return createMovie(11, ['Action']);
      if (id === 12) return createMovie(12, ['Comedy']);
    });

    contentRepo.findCandidates.mockResolvedValue([
      createMovie(20, ['Action']),
    ]);

    await strategy.recommend(1);

    // User vector should be: Action=2/3, Comedy=1/3
    const userVector = [2 / 3, 1 / 3, 0];
    expect(mathService.cosineSimilarity).toHaveBeenCalledWith(
      userVector,
      expect.any(Array)
    );
  });

  it('should pass preferred genres to findCandidates', async () => {
    ratingsRepo.findByUser.mockResolvedValue([
      createRating(1, 10, 5),
      createRating(1, 11, 5),
    ]);

    contentRepo.findOne.mockImplementation((id) =>
      id === 10
        ? createMovie(10, ['Action'])
        : createMovie(11, ['Comedy'])
    );

    contentRepo.findCandidates.mockResolvedValue([]);

    await strategy.recommend(1);

    expect(contentRepo.findCandidates).toHaveBeenCalledWith(
      expect.any(Array),               // seenMovieIds
      ['Action', 'Comedy'],            // preferredGenres
      expect.any(Number),
    );
  });

  it('should include movie if similarity equals MIN_SIMILARITY_SCORE', async () => {
    ratingsRepo.findByUser.mockResolvedValue([
      createRating(1, 10, 5),
    ]);

    contentRepo.findOne.mockResolvedValue(
      createMovie(10, ['Action'])
    );

    contentRepo.findCandidates.mockResolvedValue([
      createMovie(20, ['Action']),
    ]);

    mathService.cosineSimilarity.mockReturnValue(
      CONFIG.MIN_SIMILARITY_SCORE
    );

    const res = await strategy.recommend(1);

    expect(res).toHaveLength(1);
  });

  it('should sort recommendations by score descending', async () => {
    ratingsRepo.findByUser.mockResolvedValue([
      createRating(1, 10, 5),
    ]);

    contentRepo.findOne.mockResolvedValue(
      createMovie(10, ['Action'])
    );

    contentRepo.findCandidates.mockResolvedValue([
      createMovie(20, ['Action']),
      createMovie(21, ['Action']),
    ]);

    mathService.cosineSimilarity
      .mockReturnValueOnce(0.3)
      .mockReturnValueOnce(0.9);

    const res = await strategy.recommend(1);

    expect(res[0].score).toBeGreaterThan(res[1].score);
  });

  it('should respect limit parameter', async () => {
    ratingsRepo.findByUser.mockResolvedValue([
      createRating(1, 10, 5),
    ]);

    contentRepo.findOne.mockResolvedValue(
      createMovie(10, ['Action'])
    );

    contentRepo.findCandidates.mockResolvedValue([
      createMovie(20, ['Action']),
      createMovie(21, ['Action']),
      createMovie(22, ['Action']),
    ]);

    mathService.cosineSimilarity.mockReturnValue(1);

    const res = await strategy.recommend(1, 1);

    expect(res).toHaveLength(1);
  });
});
