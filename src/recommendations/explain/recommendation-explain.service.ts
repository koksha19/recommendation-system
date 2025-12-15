import { Injectable } from '@nestjs/common';
import { ContentBasedStrategy } from '../strategies/content-based.strategy';
import { CollaborativeStrategy } from '../strategies/collaborative.strategy';
import { CONFIG } from '../../common/constants/recommendation.constants';

@Injectable()
export class RecommendationExplainService {
  constructor(
    private readonly contentBased: ContentBasedStrategy,
    private readonly collaborative: CollaborativeStrategy,
  ) {}

  async explain(userId: number, movieId: number) {
    const contentResults = await this.contentBased.recommend(
      userId,
      CONFIG.HYBRID_MERGE_LIMIT,
    );

    const collabResults = await this.collaborative.recommend(
      userId,
      CONFIG.HYBRID_MERGE_LIMIT,
    );

    const contentItem = contentResults.find(
      (r) => r.movie.movieId === movieId,
    );
    const collabItem = collabResults.find(
      (r) => r.movie.movieId === movieId,
    );

    const contentScore = contentItem?.score ?? 0;
    const collabScore = collabItem?.score != null ? collabItem.score / 5 : 0;

    const finalScore =
      CONFIG.HYBRID_WEIGHT_ALPHA * contentScore +
      (1 - CONFIG.HYBRID_WEIGHT_ALPHA) * collabScore;

    return {
      movieId,
      finalScore,
      contentBased: contentItem
        ? { score: contentItem.score, matchedGenres: contentItem.movie.genres }
        : null,
      collaborative: collabItem
        ? { predictedRating: collabItem.score}
        : null,
    };
  }
}
