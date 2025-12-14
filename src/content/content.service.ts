import { Injectable, NotFoundException } from '@nestjs/common';

import { ContentRepository } from './content.repository';
import { SearchMovieDto, MovieResponseDto } from './dto/movie.dto';
import { IMovie } from '../common/interfaces/movie.interface';
import { SEARCH_CONFIG } from '../common/constants/recommendation.constants';

@Injectable()
export class ContentService {
  constructor(
    private readonly contentRepository: ContentRepository,
  ) {}

  public async findOne(movieId: number): Promise<MovieResponseDto> {
    const movie = await this.contentRepository.findOne(movieId);

    if (!movie) {
      throw new NotFoundException(`Movie with ID ${movieId} not found`);
    }

    return this.mapToDto(movie);
  }

  public async search(params: SearchMovieDto): Promise<MovieResponseDto[]> {
    const {
      query,
      genre,
      limit = SEARCH_CONFIG.DEFAULT_LIMIT,
      offset = SEARCH_CONFIG.DEFAULT_OFFSET,
    } = params;

    const filter: any = {};

    if (query) {
      filter.title = { $regex: query, $options: 'i' };
    }

    if (genre) {
      filter.genres = genre;
    }

    const movies = await this.contentRepository.search(filter, limit, offset);

    return movies.map(this.mapToDto);
  }

  public async getGenres(): Promise<string[]> {
    return this.contentRepository.getGenres();
  }

  private mapToDto(movie: IMovie): MovieResponseDto {
    return {
      movieId: movie.movieId,
      title: movie.title,
      genres: movie.genres,
    };
  }
}
