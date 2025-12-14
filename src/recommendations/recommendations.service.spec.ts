import { Test, TestingModule } from '@nestjs/testing';

import { RecommendationsService } from './recommendations.service';
import { RatingsService } from '../ratings/ratings.service';
import { MathService } from '../common/math/math.service';
import { RatingsRepository } from '../ratings/ratings.repository';
import { ContentRepository } from '../content/content.repository';
import { IMovie } from '../common/interfaces/movie.interface';
import { IRating } from '../common/interfaces/rating.interface';
import { CONFIG } from '../common/constants/recommendation.constants';

const createRating = (user: number, movie: number, rating: number): IRating => (
  { userId: user, movieId: movie, rating: rating, timestamp: 0 }
);
const createMovie = (id: number, genres: string[]): IMovie => (
  { movieId: id, title: `Mov ${id}`, genres: genres }
);

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let ratingsRepo;
  let contentRepo;
  let ratingsService;

  beforeEach(async () => {
    ratingsRepo = { findByUser: jest.fn() };
    contentRepo = {
      findOne: jest.fn().mockImplementation((id) =>
        Promise.resolve({ movieId: id, title: 'Test', genres: [] })
      ),
      getGenres: jest.fn().mockResolvedValue(['Action', 'Comedy', 'Drama', 'Horror']),
      findCandidates: jest.fn()
    };
    ratingsService = { getAllRatingsGroupedByUser: jest.fn() };

    const realMathService = new MathService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: RatingsRepository, useValue: ratingsRepo },
        { provide: ContentRepository, useValue: contentRepo },
        { provide: RatingsService, useValue: ratingsService },
        { provide: MathService, useValue: realMathService },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  describe('Content-Based Filtering', () => {
    it('Scenario: The "Action" Fan (Pure Genre Match)', async () => {
      // User loves Action (5 stars), hates Drama (1 star)
      ratingsRepo.findByUser.mockResolvedValue([
        createRating(1, 10, 5), // Action
        createRating(1, 11, 1), // Drama
      ]);

      // DB returns movie details
      contentRepo.findOne.mockImplementation((id) => {
        if(id===10) return createMovie(10, ['Action']);
        if(id===11) return createMovie(11, ['Drama']);
      });

      // Candidates available in DB
      const candidates = [
        createMovie(20, ['Action']),       // Perfect match
        createMovie(21, ['Action', 'Comedy']), // Partial match
        createMovie(22, ['Drama']),        // Mismatch
      ];
      contentRepo.findCandidates.mockResolvedValue(candidates);

      const res = await service.getContentBasedRecommendations(1);

      // Expectation: Action movie is #1, Drama is likely not even in list or very low
      expect(res[0].movie.movieId).toBe(20);
      expect(res[0].score).toBeCloseTo(1.0);
    });

    it('Scenario: User with minimal positive ratings (Threshold check)', async () => {
      // User rated everything 3.0 (below threshold 4.0)
      ratingsRepo.findByUser.mockResolvedValue([
        createRating(1, 10, 3.5),
        createRating(1, 11, 3.9),
      ]);

      const res = await service.getContentBasedRecommendations(1);
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

      const res = await service.getContentBasedRecommendations(1);
      expect(res[0].movie.movieId).toBe(20);
    });
  });

  describe('Collaborative Filtering', () => {
    it('Scenario: "The Twin" (Perfect correlation)', async () => {
      // Target User (1): Likes [A, B]
      // Neighbor (2): Likes [A, B, C]

      const u1 = new Map([[100, 5], [101, 5]]);
      const u2 = new Map([[100, 5], [101, 5], [102, 5]]); // 102 is the target recommendation

      ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
        [1, u1], [2, u2]
      ]));
      contentRepo.findOne.mockResolvedValue(createMovie(102, ['Any']));

      const res = await service.getCollaborativeRecommendations(1);

      expect(res.length).toBe(1);
      expect(res[0].movie.movieId).toBe(102);
      expect(res[0].score).toBe(5); // Predicted score should be max
    });

    it('Scenario: "The Opposite" (Weighted Average Check)', async () => {
      const target = new Map([[100, 5], [101, 1]]);
      const twin = new Map([[100, 5], [101, 1], [999, 5]]);

      // Opposite (User 2):
      // Similarity will be low but positive
      const opposite = new Map([[100, 1], [101, 5], [999, 1]]);

      ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
        [1, target],
        [2, opposite],
        [3, twin]
      ]));

      contentRepo.findOne.mockResolvedValue(createMovie(999, ['Any']));

      const res = await service.getCollaborativeRecommendations(1);

      const rec = res.find(r => r.movie.movieId === 999);
      expect(rec).toBeDefined();

      // Maths:
      // Score = (5 * 1.0 + 1 * 0.3) / (1.0 + 0.3) = 5.3 / 1.3 ≈ 4.07
      // If they were equal: (5+1)/2 = 3
      expect(rec!.score).toBeGreaterThan(3.5);
    });

    it('Scenario: "The Popularity Noise" (Filtering insufficient overlap)', async () => {
      // Users share only 1 movie. Even if rating matches, it's not enough to be neighbors.
      const u1 = new Map([[100, 5]]);
      const u2 = new Map([[100, 5], [200, 5]]);

      ratingsService.getAllRatingsGroupedByUser.mockResolvedValue(new Map([
        [1, u1], [2, u2]
      ]));

      const res = await service.getCollaborativeRecommendations(1);
      expect(res).toEqual([]);
    });
  });

  describe('Hybrid Strategy', () => {
    it('should prioritize Content if Collaborative returns nothing (Cold start for collab)', async () => {
      jest.spyOn(service, 'getContentBasedRecommendations').mockResolvedValue([
        { movie: createMovie(1, []), score: 0.8, strategy: 'Content-Based' }
      ]);
      jest.spyOn(service, 'getCollaborativeRecommendations').mockResolvedValue([]);

      const res = await service.getHybridRecommendations(1);
      expect(res.length).toBe(1);
      expect(res[0].score).toBe(0.8 * CONFIG.HYBRID_WEIGHT_ALPHA);
    });

    it('should calculate weighted average correctly', async () => {
      const movie = createMovie(1, []);
      // Content score: 0.5
      // Collab score: 5.0 (Normalized -> 1.0)
      // Alpha: 0.6
      // Result: (0.6 * 0.5) + (0.4 * 1.0) = 0.3 + 0.4 = 0.7

      jest.spyOn(service, 'getContentBasedRecommendations').mockResolvedValue([
        { movie, score: 0.5, strategy: 'Content-Based' }
      ]);
      jest.spyOn(service, 'getCollaborativeRecommendations').mockResolvedValue([
        { movie, score: 5.0, strategy: 'Collaborative-Filtering' }
      ]);

      const res = await service.getHybridRecommendations(1, 10, 0.6);
      expect(res[0].score).toBeCloseTo(0.7);
    });
  });
});
