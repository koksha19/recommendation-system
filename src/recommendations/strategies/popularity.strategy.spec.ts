import { Test } from '@nestjs/testing';
import { PopularityStrategy } from './popularity.strategy';
import { RatingsService } from '../../ratings/ratings.service';
import { ContentRepository } from '../../content/content.repository';

describe('PopularityStrategy', () => {
  let strategy: PopularityStrategy;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PopularityStrategy,
        {
          provide: RatingsService,
          useValue: {
            getAllRatingsGroupedByMovie: jest.fn().mockResolvedValue(
              new Map([
                [1, [5, 4, 5]],
                [2, [3, 3]],
              ]),
            ),
          },
        },
        {
          provide: ContentRepository,
          useValue: {
            findOne: jest.fn().mockImplementation((id) => ({
              movieId: id,
              title: `Movie ${id}`,
              genres: [],
            })),
          },
        },
      ],
    }).compile();

    strategy = moduleRef.get(PopularityStrategy);
  });

  it('should rank movies by popularity', async () => {
    const result = await strategy.recommend();

    expect(result[0].movie.movieId).toBe(1);
    expect(result[0].score).toBeLessThanOrEqual(1);
    expect(result[0].strategy).toBe('Popularity');
  });
});
