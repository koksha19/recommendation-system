import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rating, RatingDocument } from './schemas/rating.schema';
import { CreateRatingDto, RatingResponseDto } from './dto/ratings.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectModel(Rating.name) private ratingModel: Model<RatingDocument>,
  ) {}

  public async setRating(createRatingDto: CreateRatingDto,): Promise<RatingResponseDto> {
    const { userId, movieId, rating } = createRatingDto;
    const timestamp = Math.floor(Date.now() / 1000);

    const updatedRating = await this.ratingModel.findOneAndUpdate(
      { userId, movieId },
      { rating, timestamp },
      { new: true, upsert: true }
    ).exec();

    return this.mapToDto(updatedRating);
  }

  public async getUserRatings(userId: number): Promise<RatingResponseDto[]> {
    const ratings = await this.ratingModel.find({ userId }).exec();
    return ratings.map(this.mapToDto);
  }

  public async getMovieRatings(movieId: number): Promise<RatingResponseDto[]> {
    const ratings = await this.ratingModel.find({ movieId }).exec();
    return ratings.map(this.mapToDto);
  }

  public async getAllRatingsGroupedByUser(): Promise<Map<number, Map<number, number>>> {
    const allRatings = await this.ratingModel.find().select('userId movieId rating').exec();

    const userMap = new Map<number, Map<number, number>>();

    for (const rating of allRatings) {
      if (!userMap.has(rating.userId)) {
        userMap.set(rating.userId, new Map());
      }

      userMap.get(rating.userId)!.set(rating.movieId, rating.rating);
    }

    return userMap;
  }

  private mapToDto(rating: RatingDocument): RatingResponseDto {
    return {
      userId: rating.userId,
      movieId: rating.movieId,
      rating: rating.rating,
      timestamp: rating.timestamp,
    };
  }
}
