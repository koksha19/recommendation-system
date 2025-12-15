import { Injectable } from '@nestjs/common';

import { CreateRatingDto, RatingResponseDto } from './dto/ratings.dto';
import { RatingsRepository } from './ratings.repository';
import { IRating } from '../common/interfaces/rating.interface';

@Injectable()
export class RatingsService {
  constructor(private readonly ratingsRepository: RatingsRepository) {}

  public async setRating(createRatingDto: CreateRatingDto): Promise<RatingResponseDto> {
    const { userId, movieId, rating } = createRatingDto;

    const updatedRating: IRating = await this.ratingsRepository.upsert(userId, movieId, rating);

    return this.mapToDto(updatedRating);
  }

  public async getUserRatings(userId: number): Promise<RatingResponseDto[]> {
    const ratings: IRating[] = await this.ratingsRepository.findByUser(userId);

    return ratings.map(this.mapToDto);
  }

  public async getAllRatingsGroupedByUser(): Promise<Map<number, Map<number, number>>> {
    const allRatings: IRating[] = await this.ratingsRepository.findAll();

    const userMap = new Map<number, Map<number, number>>();

    for (const rating of allRatings) {
      if (!userMap.has(rating.userId)) {
        userMap.set(rating.userId, new Map());
      }

      userMap.get(rating.userId)!.set(rating.movieId, rating.rating);
    }

    return userMap;
  }

  public async getAllRatingsGroupedByMovie(): Promise<Map<number, number[]>> {
    const allRatings: IRating[] = await this.ratingsRepository.findAll();

    const movieMap = new Map<number, number[]>();

    for (const rating of allRatings) {
      if (!movieMap.has(rating.movieId)) {
        movieMap.set(rating.movieId, []);
      }

      movieMap.get(rating.movieId)!.push(rating.rating);
    }

    return movieMap;
  }

  private mapToDto(rating: IRating): RatingResponseDto {
    return {
      userId: rating.userId,
      movieId: rating.movieId,
      rating: rating.rating,
      timestamp: rating.timestamp,
    };
  }
}
