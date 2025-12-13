import { Injectable, Logger } from '@nestjs/common';
import { ContentService } from '../content/content.service';
import { RatingsService } from '../ratings/ratings.service';
import { MathService } from '../common/math/math.service';
import { RecommendationResultDto } from './dto/recommendation.dto';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly contentService: ContentService,
    private readonly ratingsService: RatingsService,
    private readonly mathService: MathService,
  ) {}

  async getContentBasedRecommendations(userId: number, limit: number = 10): Promise<RecommendationResultDto[]> {
    const userRatings = await this.ratingsService.getUserRatings(userId);

    if (!userRatings.length) {
      return [];
    }

    const seenMovieIds = userRatings.map((rating) => rating.movieId);
    const likedRatings = userRatings.filter((rating) => rating.rating >= 4.0);

    if (likedRatings.length === 0) {
      return [];
    }

    const likedMovieIds = likedRatings.map((r) => r.movieId);

    const likedMoviesData = await Promise.all(
      likedMovieIds.map((id) => this.contentService.findOne(id))
    );

    const userPreferredGenres = new Set<string>();
    likedMoviesData.forEach((movie) => {
      movie.genres.forEach((genre) => userPreferredGenres.add(genre));
    });

    const preferredGenresArray = Array.from(userPreferredGenres);

    const allGenres = await this.contentService.getGenres();

    const candidates = await this.contentService.findRecommendationsCandidates(
      seenMovieIds,
      preferredGenresArray,
    );

    this.logger.log(`Found ${candidates.length} candidates for user ${userId} via DB query`);

    const recommendations: RecommendationResultDto[] = [];

    const likedVectors = likedMoviesData.map(movie => ({
      movie,
      vector: this.toOneHotVector(movie.genres, allGenres)
    }));

    for (const candidate of candidates) {
      const candidateVector = this.toOneHotVector(candidate.genres, allGenres);

      let maxSimilarity = 0;

      for (const { vector: likedVector } of likedVectors) {
        const similarity = this.mathService.cosineSimilarity(likedVector, candidateVector);

        if (similarity && similarity > maxSimilarity) {
          maxSimilarity = similarity;
        }
      }

      if (maxSimilarity > 0.3) {
        recommendations.push({
          movie: candidate,
          score: maxSimilarity,
          strategy: 'Content-Based',
        });
      }
    }

    return recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private toOneHotVector(movieGenres: string[], allGenres: string[]): number[] {
    const movieGenreSet = new Set(movieGenres);

    return allGenres.map((genre) => (movieGenreSet.has(genre) ? 1 : 0));
  }
}
