import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentRepository } from './content.repository';
import { SEARCH_CONFIG } from '../common/constants/recommendation.constants';

const createMockMovie = (id: number, title: string, genres: string[]) => ({
  movieId: id,
  title,
  genres,
});

describe('ContentService', () => {
  let service: ContentService;
  let repository: any;

  beforeEach(async () => {
    const mockContentRepository = {
      findOne: jest.fn(),
      search: jest.fn(),
      getGenres: jest.fn(),
      findCandidates: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        { provide: ContentRepository, useValue: mockContentRepository },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    repository = module.get(ContentRepository);
  });

  describe('findOne', () => {
    it('should return a mapped DTO when movie exists', async () => {
      const movie = createMockMovie(1, 'Matrix', ['Sci-Fi']);
      repository.findOne.mockResolvedValue(movie);

      const result = await service.findOne(1);
      expect(result).toEqual(movie);
      expect(repository.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when movie does not exist', async () => {
      repository.findOne.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should propagate database errors', async () => {
      repository.findOne.mockRejectedValue(new Error('DB Connection Failed'));
      await expect(service.findOne(1)).rejects.toThrow('DB Connection Failed');
    });

    it('should include movieId in NotFoundException message', async () => {
      repository.findOne.mockResolvedValue(null);

      try {
        await service.findOne(42);
      } catch (e) {
        expect(e.message).toContain('42');
      }
    });

    it('should not mutate repository movie object', async () => {
      const movie = createMockMovie(1, 'Matrix', ['Sci-Fi']);
      repository.findOne.mockResolvedValue(movie);

      const result = await service.findOne(1);

      expect(result).not.toBe(movie);
      expect(movie).toEqual(createMockMovie(1, 'Matrix', ['Sci-Fi']));
    });

    it('should call repository exactly once', async () => {
      repository.findOne.mockResolvedValue(
        createMockMovie(1, 'Test', [])
      );

      await service.findOne(1);

      expect(repository.findOne).toHaveBeenCalledTimes(1);
    });

  });

  describe('search', () => {
    it('should use default limits and offsets if not provided', async () => {
      repository.search.mockResolvedValue([]);
      await service.search({});

      expect(repository.search).toHaveBeenCalledWith(
        {},
        SEARCH_CONFIG.DEFAULT_LIMIT,
        SEARCH_CONFIG.DEFAULT_OFFSET
      );
    });

    it('should filter by query (title) only', async () => {
      repository.search.mockResolvedValue([]);
      await service.search({ query: 'Star' });

      expect(repository.search).toHaveBeenCalledWith(
        { title: { $regex: 'Star', $options: 'i' } },
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should filter by genre only', async () => {
      repository.search.mockResolvedValue([]);
      await service.search({ genre: 'Comedy' });

      expect(repository.search).toHaveBeenCalledWith(
        { genres: 'Comedy' },
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should filter by BOTH query and genre', async () => {
      repository.search.mockResolvedValue([]);
      await service.search({ query: 'Dark', genre: 'Thriller' });

      expect(repository.search).toHaveBeenCalledWith(
        {
          title: { $regex: 'Dark', $options: 'i' },
          genres: 'Thriller'
        },
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should map results to DTOs', async () => {
      repository.search.mockResolvedValue([
        createMockMovie(1, 'Matrix', ['Sci-Fi']),
        createMockMovie(2, 'Test', ['Comedy', 'Drama']),
      ]);

      const res = await service.search({});
      expect(res).toHaveLength(2);
      expect(res[0].movieId).toBe(1);
    });

    it('should respect custom limit and offset', async () => {
      repository.search.mockResolvedValue([]);
      await service.search({ limit: 100, offset: 50 });

      expect(repository.search).toHaveBeenCalledWith(
        {}, 100, 50
      );
    });

    it('should map ALL returned items to DTOs', async () => {
      const movies = [
        createMockMovie(1, 'A', ['Genre']),
        createMockMovie(2, 'B', ['Genre']),
        createMockMovie(3, 'C', ['Genre']),
      ];
      repository.search.mockResolvedValue(movies);

      const result = await service.search({});
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('A');
      expect(result[2].movieId).toBe(3);
    });

    it('should ignore empty query string', async () => {
      repository.search.mockResolvedValue([]);

      await service.search({ query: '' });

      expect(repository.search).toHaveBeenCalledWith(
        {},
        SEARCH_CONFIG.DEFAULT_LIMIT,
        SEARCH_CONFIG.DEFAULT_OFFSET
      );
    });

    it('should ignore whitespace-only query', async () => {
      repository.search.mockResolvedValue([]);

      await service.search({ query: '   ' });

      expect(repository.search).toHaveBeenCalledWith(
        { title: { $regex: '   ', $options: 'i' } },
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should always use case-insensitive regex for title', async () => {
      repository.search.mockResolvedValue([]);

      await service.search({ query: 'mAtRiX' });

      const filterArg = repository.search.mock.calls[0][0];
      expect(filterArg.title.$options).toBe('i');
    });

    it('should not include undefined fields in filter', async () => {
      repository.search.mockResolvedValue([]);

      await service.search({});

      const filter = repository.search.mock.calls[0][0];
      expect(filter).toEqual({});
    });

    it('should handle very large offset values', async () => {
      repository.search.mockResolvedValue([]);

      await service.search({ offset: 1_000_000 });

      expect(repository.search).toHaveBeenCalledWith(
        {},
        SEARCH_CONFIG.DEFAULT_LIMIT,
        1_000_000
      );
    });

    it('should propagate repository search errors', async () => {
      repository.search.mockRejectedValue(
        new Error('Search failed')
      );

      await expect(service.search({}))
        .rejects
        .toThrow('Search failed');
    });

    it('should combine query, genre, limit and offset correctly', async () => {
      repository.search.mockResolvedValue([]);

      await service.search({
        query: 'Star',
        genre: 'Sci-Fi',
        limit: 5,
        offset: 10,
      });

      expect(repository.search).toHaveBeenCalledWith(
        {
          title: { $regex: 'Star', $options: 'i' },
          genres: 'Sci-Fi',
        },
        5,
        10
      );
    });
  });

  describe('getGenres', () => {
    it('should return a flat list of strings', async () => {
      const genres = ['Action', 'Comedy', 'Horror'];
      repository.getGenres.mockResolvedValue(genres);

      const result = await service.getGenres();
      expect(result).toEqual(genres);
    });

    it('should handle empty database gracefully', async () => {
      repository.getGenres.mockResolvedValue([]);
      const result = await service.getGenres();
      expect(result).toEqual([]);
    });

    it('should propagate repository errors', async () => {
      repository.getGenres.mockRejectedValue(
        new Error('DB error')
      );

      await expect(service.getGenres())
        .rejects
        .toThrow('DB error');
    });

    it('should not modify genres list', async () => {
      const genres = ['Action', 'Comedy'];
      repository.getGenres.mockResolvedValue(genres);

      const result = await service.getGenres();

      expect(result).toBe(genres);
    });

  });
});
