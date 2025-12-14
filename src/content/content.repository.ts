import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Movie, MovieDocument } from './schemas/movie.schema';
import { IMovie } from '../common/interfaces/movie.interface';

@Injectable()
export class ContentRepository {
  constructor(@InjectModel(Movie.name) private movieModel: Model<MovieDocument>) {}

  public findOne(movieId: number): Promise<IMovie | null> {
    return this.movieModel.findOne({ movieId }).lean().exec();
  }

  public getGenres(): Promise<string[]> {
    return this.movieModel.distinct('genres').exec();
  }

  public findCandidates(seenIds: number[], likedGenres: string[], limit: number): Promise<IMovie[]> {
    return this.movieModel
      .find({
        movieId: { $nin: seenIds },
        genres: { $in: likedGenres },
      })
      .limit(limit)
      .lean()
      .exec();
  }
}
