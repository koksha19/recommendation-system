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
  });
});
