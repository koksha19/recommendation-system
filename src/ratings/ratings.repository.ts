import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Rating, RatingDocument } from './schemas/rating.schema';
import { IRating } from '../common/interfaces/rating.interface';

@Injectable()
export class RatingsRepository {
  constructor(@InjectModel(Rating.name) private ratingModel: Model<RatingDocument>) {}

  public upsert(userId: number, movieId: number, rating: number): Promise<IRating> {
    const timestamp = Math.floor(Date.now() / 1000);

    return this.ratingModel.findOneAndUpdate(
      { userId, movieId },
      { rating, timestamp },
      { new: true, upsert: true, lean: true }
    ).exec() as Promise<IRating>;
  }

  public findByUser(userId: number): Promise<IRating[]> {
    return this.ratingModel.find({ userId }).lean().exec();
  }

  public findAll(): Promise<IRating[]> {
    return this.ratingModel.find().select('userId movieId rating').lean().exec();
  }
}
