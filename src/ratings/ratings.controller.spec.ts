import { Test, TestingModule } from '@nestjs/testing';
import { RatingsController } from './ratings.controller';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/ratings.dto';

describe('RatingsController', () => {
  let controller: RatingsController;
  let service: any;

  beforeEach(async () => {
    service = {
      setRating: jest.fn(),
      getUserRatings: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RatingsController],
      providers: [{ provide: RatingsService, useValue: service }],
    }).compile();

    controller = module.get<RatingsController>(RatingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('rateMovie', () => {
    it('should call service.setRating', async () => {
      const dto: CreateRatingDto = { userId: 1, movieId: 10, rating: 5 };
      service.setRating.mockResolvedValue({ ...dto, timestamp: 123 });

      const res = await controller.setRating(dto);
      expect(service.setRating).toHaveBeenCalledWith(dto);
      expect(res.rating).toBe(5);
    });

    it('should handle service errors', async () => {
      service.setRating.mockRejectedValue(new Error('Validation failed'));
      await expect(controller.setRating({ userId: 1, movieId: 1, rating: 6 })).rejects.toThrow();
    });
  });
});
