import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { MovieResponseDto } from './dto/movie.dto';
import { NotFoundException } from '@nestjs/common';

const mockMovie: MovieResponseDto = {
  movieId: 1,
  title: 'Test Movie',
  genres: ['Action', 'Test'],
};

const mockContentService = {
  search: jest.fn().mockResolvedValue([mockMovie]),
  findOne: jest.fn().mockImplementation((id: number) => {
    if (id === 1) {
      return Promise.resolve(mockMovie);
    }

    throw new NotFoundException('Movie not found');
  }),
  getGenres: jest.fn().mockResolvedValue(['Action', 'Test']),
};

describe('ContentController', () => {
  let controller: ContentController;
  let service: ContentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        {
          provide: ContentService,
          useValue: mockContentService,
        },
      ],
    }).compile();

    controller = module.get<ContentController>(ContentController);
    service = module.get<ContentService>(ContentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should return an array of movies', async () => {
      const result = await controller.search({ query: 'Test' });

      expect(result).toEqual([mockMovie]);
      expect(service.search).toHaveBeenCalledWith({ query: 'Test' });
    });

    it('should handle empty search results', async () => {
      jest.spyOn(service, 'search').mockResolvedValueOnce([]);

      const result = await controller.search({ query: 'Unknown' });
      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return a single movie', async () => {
      const result = await controller.getById(1);
      expect(result).toEqual(mockMovie);
    });

    it('should throw NotFoundException if movie does not exist', async () => {
      await expect(controller.getById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getGenres', () => {
    it('should return list of genres', async () => {
      const result = await controller.getGenres();
      expect(result).toEqual(['Action', 'Test']);
      expect(service.getGenres).toHaveBeenCalled();
    });
  });
});
