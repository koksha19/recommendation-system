import { Injectable } from '@nestjs/common';
import { RatingsRepository } from '../../ratings/ratings.repository';
import { ContentRepository } from '../../content/content.repository';
import { MathService } from '../../common/math/math.service';
import { RecommendationResultDto } from '../dto/recommendation.dto';
import { IMovie } from '../../common/interfaces/movie.interface';
import { IRating } from '../../common/interfaces/rating.interface';
import { CONFIG } from '../../common/constants/recommendation.constants';

@Injectable()
export class ContentBasedStrategy {
  constructor(
    private readonly ratingsRepository: RatingsRepository,
    private readonly contentRepository: ContentRepository,
    private readonly mathService: MathService,
  ) {}

  public async recommend(
    userId: number,
    limit: number = CONFIG.DEFAULT_OUTPUT_LIMIT,
  ): Promise<RecommendationResultDto[]> {
    const userRatings: IRating[] =
      await this.ratingsRepository.findByUser(userId);

    if (!userRatings.length) return [];

    const likedRatings = userRatings.filter(
      (r) => r.rating >= CONFIG.POSITIVE_RATING_THRESHOLD,
    );

    if (!likedRatings.length) return [];

    const seenMovieIds = new Set(userRatings.map((r) => r.movieId));

    const likedMovies: IMovie[] = (
      await Promise.all(
        likedRatings.map((r) =>
          this.contentRepository.findOne(r.movieId),
        ),
      )
    ).filter((m): m is IMovie => Boolean(m));

    const allGenres = await this.contentRepository.getGenres();

    const userVector = this.buildUserProfileVector(
      likedMovies,
      allGenres,
    );

    const preferredGenres = Array.from(
      new Set(likedMovies.flatMap((m) => m.genres)),
    );

    const candidates = await this.contentRepository.findCandidates(
      Array.from(seenMovieIds),
      preferredGenres,
      CONFIG.CONTENT_CANDIDATE_LIMIT,
    );

    const results: RecommendationResultDto[] = [];

    for (const candidate of candidates) {
      const candidateVector = this.toVector(
        candidate.genres,
        allGenres,
      );

      const similarity =
        this.mathService.cosineSimilarity(
          userVector,
          candidateVector,
        ) || 0;

      if (similarity >= CONFIG.MIN_SIMILARITY_SCORE) {
        results.push({
          movie: candidate,
          score: similarity,
          strategy: 'Content-Based',
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private buildUserProfileVector(
    movies: IMovie[],
    allGenres: string[],
  ): number[] {
    const vector = new Array(allGenres.length).fill(0);

    for (const movie of movies) {
      const movieVector = this.toVector(
        movie.genres,
        allGenres,
      );
      for (let i = 0; i < vector.length; i++) {
        vector[i] += movieVector[i];
      }
    }

    return vector.map((v) => v / movies.length);
  }

  private toVector(
    movieGenres: string[],
    allGenres: string[],
  ): number[] {
    const set = new Set(movieGenres);
    return allGenres.map((g) => (set.has(g) ? 1 : 0));
  }
}
