import { Test } from '@nestjs/testing';
import { PopularityStrategy } from './popularity.strategy';
import { RatingsService } from '../../ratings/ratings.service';
import { ContentRepository } from '../../content/content.repository';

describe('PopularityStrategy', () => {
  let strategy: PopularityStrategy;
  let ratingsService: any;
  let contentRepo: any;

  beforeEach(async () => {
    ratingsService = {
      getAllRatingsGroupedByMovie: jest.fn().mockResolvedValue(
        new Map([
          [1, [5, 4, 5]],
          [2, [3, 3]]
        ])
      )
    };

    contentRepo = {
      findOne: jest.fn().mockImplementation((id) => ({
        movieId: id,
        title: `Movie ${id}`,
        genres: []
      }))
    };

    const module = await Test.createTestingModule({
      providers: [
        PopularityStrategy,
        { provide: RatingsService, useValue: ratingsService },
        { provide: ContentRepository, useValue: contentRepo },
      ],
    }).compile();

    strategy = module.get(PopularityStrategy);
  });

  it('should rank movies by popularity', async () => {
    const result = await strategy.recommend();

    expect(result[0].movie.movieId).toBe(1);
    expect(result[0].score).toBeLessThanOrEqual(1);
    expect(result[0].strategy).toBe('Popularity');
  });

  it('should return empty if no ratings exist', async () => {
    ratingsService.getAllRatingsGroupedByMovie.mockResolvedValue(new Map());
    expect(await strategy.recommend()).toEqual([]);
  });

  it('should calculate popularity using log formula', async () => {
    const ratings = new Map([
      [1, [5, 5, 5, 5, 5]],
      [2, [5]],
    ]);
    ratingsService.getAllRatingsGroupedByMovie.mockResolvedValue(ratings);
    contentRepo.findOne.mockImplementation((id) => ({ movieId: id }));

    const res = await strategy.recommend();
    expect(res.length).toBe(2);
    expect(res[0].movie.movieId).toBe(1);
    expect(res[0].strategy).toBe('Popularity');
  });

  it('should filter out movies not found in DB', async () => {
    ratingsService.getAllRatingsGroupedByMovie.mockResolvedValue(new Map([[1, [5]]]));
    contentRepo.findOne.mockResolvedValue(null);
    expect(await strategy.recommend()).toEqual([]);
  });

  it('should normalize scores to 0-1 range', async () => {
    ratingsService.getAllRatingsGroupedByMovie.mockResolvedValue(new Map([
      [1, [5, 5, 5]],
      [2, [3]]
    ]));
    contentRepo.findOne.mockImplementation((id) => ({ movieId: id }));

    const res = await strategy.recommend();
    expect(res[0].score).toBeCloseTo(1.0);
    expect(res[1].score).toBeLessThan(1.0);
  });

  it('should return single movie with normalized score = 1', async () => {
    ratingsService.getAllRatingsGroupedByMovie.mockResolvedValue(
      new Map([[1, [4, 4, 4]]])
    );

    contentRepo.findOne.mockResolvedValue({ movieId: 1 });

    const res = await strategy.recommend();

    expect(res).toHaveLength(1);
    expect(res[0].score).toBeCloseTo(1.0);
  });

  it('should normalize equally popular movies to same score', async () => {
    ratingsService.getAllRatingsGroupedByMovie.mockResolvedValue(
      new Map([
        [1, [4, 4]],
        [2, [4, 4]],
      ])
    );

    contentRepo.findOne.mockImplementation((id) => ({ movieId: id }));

    const res = await strategy.recommend();

    expect(res[0].score).toBeCloseTo(res[1].score);
  });

  it('should favor many good ratings over a single perfect rating', async () => {
    ratingsService.getAllRatingsGroupedByMovie.mockResolvedValue(
      new Map([
        [1, [5]],
        [2, [4, 4, 4, 4, 4]],
      ])
    );

    contentRepo.findOne.mockImplementation((id) => ({ movieId: id }));

    const res = await strategy.recommend();

    expect(res[0].movie.movieId).toBe(2);
  });

  it('should rank low-rated movies lower even if many ratings exist', async () => {
    ratingsService.getAllRatingsGroupedByMovie.mockResolvedValue(
      new Map([
        [1, [5, 5]],
        [2, [1, 1, 1, 1, 1, 1]],
      ])
    );

    contentRepo.findOne.mockImplementation((id) => ({ movieId: id }));

    const res = await strategy.recommend();

    expect(res[0].movie.movieId).toBe(1);
  });

  it('should ensure all scores are between 0 and 1', async () => {
    ratingsService.getAllRatingsGroupedByMovie.mockResolvedValue(
      new Map([
        [1, [5, 5, 5]],
        [2, [3, 3]],
        [3, [1]],
      ])
    );

    contentRepo.findOne.mockImplementation((id) => ({ movieId: id }));

    const res = await strategy.recommend();

    for (const r of res) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it('should respect limit parameter', async () => {
    ratingsService.getAllRatingsGroupedByMovie.mockResolvedValue(
      new Map([
        [1, [5, 5]],
        [2, [4, 4]],
        [3, [3, 3]],
      ])
    );

    contentRepo.findOne.mockImplementation((id) => ({ movieId: id }));

    const res = await strategy.recommend(2);
    expect(res).toHaveLength(2);
  });
});
