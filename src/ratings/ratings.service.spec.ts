import { Test, TestingModule } from '@nestjs/testing';
import { RatingsService } from './ratings.service';
import { RatingsRepository } from './ratings.repository';
import { IRating } from '../common/interfaces/rating.interface';

describe('RatingsService', () => {
  let service: RatingsService;
  let repository: any;

  beforeEach(async () => {
    const mockRepo = {
      upsert: jest.fn(),
      findByUser: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RatingsService,
        { provide: RatingsRepository, useValue: mockRepo },
      ],
    }).compile();

    service = module.get<RatingsService>(RatingsService);
    repository = module.get(RatingsRepository);
  });

  describe('setRating', () => {
    it('should upsert rating and return DTO', async () => {
      const input = { userId: 1, movieId: 100, rating: 5 };
      const expectedOutput: IRating = { ...input, timestamp: 123456789 };

      repository.upsert.mockResolvedValue(expectedOutput);

      const result = await service.setRating(input);

      expect(repository.upsert).toHaveBeenCalledWith(1, 100, 5);
      expect(result.userId).toBe(1);
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getAllRatingsGroupedByUser', () => {
    it('should correctly transform a flat list into a Nested Map', async () => {
      const rawRatings: IRating[] = [
        { userId: 1, movieId: 101, rating: 5, timestamp: 1 },
        { userId: 1, movieId: 102, rating: 3, timestamp: 1 },
        { userId: 2, movieId: 101, rating: 1, timestamp: 1 },
        { userId: 3, movieId: 200, rating: 5, timestamp: 1 },
      ];

      repository.findAll.mockResolvedValue(rawRatings);

      const result = await service.getAllRatingsGroupedByUser();

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(3);

      const user1 = result.get(1)!;
      expect(user1).toBeInstanceOf(Map);
      expect(user1.get(101)).toBe(5);
      expect(user1.get(102)).toBe(3);
      expect(user1.has(200)).toBe(false);

      const user2 = result.get(2)!;
      expect(user2.get(101)).toBe(1);

      const user3 = result.get(3)!;
      expect(user3.get(200)).toBe(5);
    });

    it('should handle an empty database', async () => {
      repository.findAll.mockResolvedValue([]);
      const result = await service.getAllRatingsGroupedByUser();
      expect(result.size).toBe(0);
    });

    it('should handle massive dataset efficiently', async () => {
      const massiveRatings: IRating[] = [];
      for(let i = 0; i < 10000; i++) {
        massiveRatings.push({
          userId: i % 100,
          movieId: i,
          rating: 5,
          timestamp: 0
        });
      }
      repository.findAll.mockResolvedValue(massiveRatings);

      const start = Date.now();
      const result = await service.getAllRatingsGroupedByUser();
      const end = Date.now();

      expect(result.size).toBe(100);
      expect(end - start).toBeLessThan(500);
    });
  });

  describe('getAllRatingsGroupedByMovie', () => {
    it('should group ratings by movie id', async () => {
      repository.findAll.mockResolvedValue([
        { userId: 1, movieId: 10, rating: 5 },
        { userId: 2, movieId: 10, rating: 3 },
        { userId: 3, movieId: 20, rating: 4 },
      ]);

      const map = await service.getAllRatingsGroupedByMovie();
      expect(map.get(10)).toEqual([5, 3]);
      expect(map.get(20)).toEqual([4]);
    });
  });
});
