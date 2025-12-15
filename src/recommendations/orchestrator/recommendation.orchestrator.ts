import { Injectable } from '@nestjs/common';
import { ContentBasedStrategy } from '../strategies/content-based.strategy';
import { CollaborativeStrategy } from '../strategies/collaborative.strategy';
import { RecommendationResultDto } from '../dto/recommendation.dto';
import { CONFIG } from '../../common/constants/recommendation.constants';
import { PopularityStrategy } from '../strategies/popularity.strategy';

@Injectable()
export class RecommendationOrchestrator {
  constructor(
    private readonly contentBased: ContentBasedStrategy,
    private readonly collaborative: CollaborativeStrategy,
    private readonly popularity: PopularityStrategy,
  ) {}

  async contentBasedOnly(
    userId: number,
  ): Promise<RecommendationResultDto[]> {
    return this.contentBased.recommend(userId);
  }

  async collaborativeOnly(
    userId: number,
  ): Promise<RecommendationResultDto[]> {
    return this.collaborative.recommend(userId);
  }

  async hybrid(
    userId: number,
    limit: number = CONFIG.DEFAULT_OUTPUT_LIMIT,
    alpha: number = CONFIG.HYBRID_WEIGHT_ALPHA,
  ) {
    const [content, collaborative, popular] =
      await Promise.all([
        this.contentBased.recommend(userId),
        this.collaborative.recommend(userId),
        this.popularity.recommend(),
      ]);

    // якщо користувач новий → тільки popularity
    if (!content.length && !collaborative.length) {
      return popular.slice(0, limit);
    }

    const map = new Map<
      number,
      { movie: any; score: number }
    >();

    const merge = (
      items: any[],
      weight: number,
      normalize: (s: number) => number = (s) => s,
    ) => {
      for (const item of items) {
        const movieId = item.movie.movieId;
        const value = weight * normalize(item.score);

        if (!map.has(movieId)) {
          map.set(movieId, {
            movie: item.movie,
            score: 0,
          });
        }

        map.get(movieId)!.score += value;
      }
    };

    merge(content, alpha);
    merge(collaborative, 1 - alpha, (s) => s / 5);
    merge(popular, 0.2);

    return [...map.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => ({
        movie: r.movie,
        score: r.score,
        strategy: 'Hybrid',
      }));
  }
}
