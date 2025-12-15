import { Injectable } from '@nestjs/common';
import { RatingsService } from '../../ratings/ratings.service';
import { ContentRepository } from '../../content/content.repository';
import { RecommendationResultDto } from '../dto/recommendation.dto';
import { CONFIG } from '../../common/constants/recommendation.constants';

@Injectable()
export class PopularityStrategy {
  constructor(
    private readonly ratingsService: RatingsService,
    private readonly contentRepository: ContentRepository,
  ) {}

  async recommend(
    limit: number = CONFIG.DEFAULT_OUTPUT_LIMIT,
  ): Promise<RecommendationResultDto[]> {
    const ratingsByMovie = await this.ratingsService.getAllRatingsGroupedByMovie();

    const results: RecommendationResultDto[] = [];

    for (const [movieId, ratings] of ratingsByMovie) {
      const avg = ratings.reduce((s, r) => s + r, 0) / ratings.length;

      const popularity = avg * Math.log(1 + ratings.length);

      const movie = await this.contentRepository.findOne(movieId);

      if (!movie) continue;

      results.push({
        movie,
        score: popularity,
        strategy: 'Popularity',
      });
    }

    const maxScore = Math.max(
      ...results.map((r) => r.score),
    );

    return results
      .map((r) => ({
        ...r,
        score: r.score / maxScore,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
