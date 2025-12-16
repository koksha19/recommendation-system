import { Test, TestingModule } from '@nestjs/testing';
import { CollaborativeStrategy } from './collaborative.strategy';
import { RatingsService } from '../../ratings/ratings.service';
import { ContentRepository } from '../../content/content.repository';
import { MathService } from '../../common/math/math.service';

describe('CollaborativeStrategy', () => {
  let strategy: CollaborativeStrategy;
  let ratingsService: any;
  let contentRepo: any;
  let mathService: any;

  beforeEach(async () => {
    ratingsService = { getAllRatingsGroupedByUser: jest.fn() };
    contentRepo = { findOne: jest.fn() };
    mathService = { cosineSimilarity: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollaborativeStrategy,
        { provide: RatingsService, useValue: ratingsService },
        { provide: ContentRepository, useValue: contentRepo },
        { provide: MathService, useValue: mathService },
      ],
    }).compile();

    strategy = module.get<CollaborativeStrategy>(CollaborativeStrategy);
  });

  it('should return empty if user not found', async () => {
    ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map());
    const res = await strategy.recommend(999);
    expect(res).toEqual([]);
  });

  it('should ignore neighbors with similarity below threshold', async () => {
    const target = new Map([[1, 5], [2, 5]]);
    const weakNeighbor = new Map([[1, 5], [2, 5], [3, 5]]);

    ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
      [1, target],
      [2, weakNeighbor]
    ]));

    mathService.cosineSimilarity.mockReturnValue(0.1); // < MIN_SIMILARITY_SCORE

    const res = await strategy.recommend(1);
    expect(res).toEqual([]);
  });

  it('should treat null similarity as zero', async () => {
    const target = new Map([[1, 5], [2, 5]]);
    const neighbor = new Map([[1, 5], [2, 5], [3, 5]]);

    ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
      [1, target],
      [2, neighbor]
    ]));

    mathService.cosineSimilarity.mockReturnValue(null);

    const res = await strategy.recommend(1);
    expect(res).toEqual([]);
  });

  it('should include candidate with predicted score exactly at threshold', async () => {
    const target = new Map([[10, 3], [11, 3]]);
    const neighbor = new Map([[10, 3], [11, 3], [99, 3]]);

    ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
      [1, target],
      [2, neighbor]
    ]));

    mathService.cosineSimilarity.mockReturnValue(1.0);
    contentRepo.findOne.mockResolvedValue({ movieId: 99 });

    const res = await strategy.recommend(1);
    expect(res).toHaveLength(1);
    expect(res[0].score).toBe(3);
  });

  it('should exclude candidate with predicted score below threshold', async () => {
    const target = new Map([[10, 3], [11, 3]]);
    const neighbor = new Map([[10, 3], [11, 3], [99, 2]]);

    ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
      [1, target],
      [2, neighbor]
    ]));

    mathService.cosineSimilarity.mockReturnValue(1.0);

    const res = await strategy.recommend(1);
    expect(res).toEqual([]);
  });

  it('should skip candidate if movie not found', async () => {
    const target = new Map([[1, 5], [2, 5]]);
    const neighbor = new Map([[1, 5], [2, 5], [999, 5]]);

    ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
      [1, target],
      [2, neighbor]
    ]));

    mathService.cosineSimilarity.mockReturnValue(1.0);
    contentRepo.findOne.mockResolvedValue(null);

    const res = await strategy.recommend(1);
    expect(res).toEqual([]);
  });

  it('should sort recommendations by predicted score desc', async () => {
    const target = new Map([[1, 5], [2, 5]]);
    const neighbor = new Map([
      [1, 5],
      [2, 5],
      [10, 5],
      [11, 4]
    ]);

    ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
      [1, target],
      [2, neighbor]
    ]));

    mathService.cosineSimilarity.mockReturnValue(1.0);
    contentRepo.findOne.mockImplementation((id) => ({ movieId: id }));

    const res = await strategy.recommend(1);

    expect(res[0].movie.movieId).toBe(10);
    expect(res[1].movie.movieId).toBe(11);
  });

  it('should respect output limit', async () => {
    const target = new Map([[1, 5], [2, 5]]);
    const neighbor = new Map([
      [1, 5],
      [2, 5],
      [10, 5],
      [11, 5],
      [12, 5],
    ]);

    ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
      [1, target],
      [2, neighbor]
    ]));

    mathService.cosineSimilarity.mockReturnValue(1.0);
    contentRepo.findOne.mockImplementation((id) => ({ movieId: id }));

    const res = await strategy.recommend(1, 2);
    expect(res).toHaveLength(2);
  });

  it('Scenario: "The Twin" (Perfect correlation)', async () => {
    // Target User (1): Likes [100, 101]
    // Neighbor (2): Likes [100, 101, 102]
    const u1 = new Map([[100, 5], [101, 5]]);
    const u2 = new Map([[100, 5], [101, 5], [102, 5]]); // 102 is recommendation

    ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
      [1, u1], [2, u2]
    ]));

    contentRepo.findOne.mockResolvedValue({ movieId: 102 });
    mathService.cosineSimilarity.mockReturnValue(1.0);

    const res = await strategy.recommend(1);

    expect(res.length).toBe(1);
    expect(res[0].movie.movieId).toBe(102);
  });

  it('Scenario: "The Opposite" (Weighted Average Check)', async () => {
    const target = new Map([[100, 5], [101, 1]]);

    // Same taste
    const twin = new Map([[100, 5], [101, 1], [999, 5]]);

    // Opposite taste
    const opposite = new Map([[100, 1], [101, 5], [999, 1]]);

    ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
      [1, target],
      [2, opposite],
      [3, twin]
    ]));

    contentRepo.findOne.mockResolvedValue({ movieId: 999 });

    mathService.cosineSimilarity
      .mockReturnValueOnce(0.3)  // Opposite
      .mockReturnValueOnce(1.0); // Twin

    const res = await strategy.recommend(1);

    const rec = res.find(r => r.movie.movieId === 999);
    expect(rec).toBeDefined();

    // Score = (5 * 1.0 + 1 * 0.3) / (1.0 + 0.3) = 5.3 / 1.3 ≈ 4.07
    // If they were equal: (5+1)/2 = 3
    expect(rec!.score).toBeGreaterThan(3.5);
  });

  it('Scenario: "The Popularity Noise" (Filtering insufficient overlap)', async () => {
    // Users share only 1 movie.
    const u1 = new Map([[100, 5]]);
    const u2 = new Map([[100, 5], [200, 5]]);

    ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
      [1, u1], [2, u2]
    ]));

    const res = await strategy.recommend(1);
    expect(res).toEqual([]);
  });

  it('Scenario: Neighbor is identical to User', async () => {
    const me = new Map([[10, 5], [11, 5]]);
    const clone = new Map([[10, 5], [11, 5]]);

    ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
      [1, me],
      [2, clone]
    ]));

    mathService.cosineSimilarity.mockReturnValue(1.0);

    const res = await strategy.recommend(1);

    expect(res).toEqual([]);
  });

  it('Scenario: Shared popularity is not taste', async () => {
    // Both like very popular movie
    const me = new Map([[999, 5]]);
    const stranger = new Map([[999, 5], [123, 5]]);

    ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
      [1, me],
      [2, stranger]
    ]));

    const res = await strategy.recommend(1);
    expect(res).toEqual([]);
  });
});
