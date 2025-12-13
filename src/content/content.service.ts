import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Movie, MovieDocument } from './schemas/movie.schema';
import { SearchMovieDto, MovieResponseDto } from './dto/movie.dto';

@Injectable()
export class ContentService {
  constructor(
    @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
  ) {}

  public async findOne(movieId: number): Promise<MovieResponseDto> {
    const movie = await this.movieModel.findOne({ movieId }).exec();

    if (!movie) {
      throw new NotFoundException(`Movie with ID ${movieId} not found`);
    }

    return this.mapToDto(movie);
  }

  public async search(params: SearchMovieDto): Promise<MovieResponseDto[]> {
    const { query, genre, limit = 20, offset = 0 } = params;
    const filter: any = {};

    if (query) {
      filter.title = { $regex: query, $options: 'i' };
    }

    if (genre) {
      filter.genres = genre;
    }

    const movies = await this.movieModel
      .find(filter)
      .skip(offset)
      .limit(limit)
      .exec();

    return movies.map(this.mapToDto);
  }

  public async getGenres(): Promise<string[]> {
    return this.movieModel.distinct('genres').exec();
  }

  public async findRecommendationsCandidates(
    seenMovieIds: number[],
    preferredGenres: string[],
    limit: number = 500
  ): Promise<MovieResponseDto[]> {
    const candidates = await this.movieModel
      .find({
        movieId: { $nin: seenMovieIds },
        genres: { $in: preferredGenres },
      })
      .limit(limit)
      .exec();

    return candidates.map(this.mapToDto);
  }

  private mapToDto(movie: MovieDocument): MovieResponseDto {
    return {
      movieId: movie.movieId,
      title: movie.title,
      genres: movie.genres,
    };
  }
}
