import { Injectable } from '@nestjs/common';
import { RatingsService } from '../../ratings/ratings.service';
import { ContentRepository } from '../../content/content.repository';
import { MathService } from '../../common/math/math.service';
import { RecommendationResultDto } from '../dto/recommendation.dto';
import { CONFIG } from '../../common/constants/recommendation.constants';

@Injectable()
export class CollaborativeStrategy {
  constructor(
    private readonly ratingsService: RatingsService,
    private readonly contentRepository: ContentRepository,
    private readonly mathService: MathService,
  ) {}

  public async recommend(
    userId: number,
    limit: number = CONFIG.DEFAULT_OUTPUT_LIMIT,
  ): Promise<RecommendationResultDto[]> {
    const allRatings =
      await this.ratingsService.getAllRatingsGroupedByUser();

    const targetRatings = allRatings.get(userId);
    if (!targetRatings) return [];

    const neighbors: {
      similarity: number;
      ratings: Map<number, number>;
    }[] = [];

    for (const [otherUserId, otherRatings] of allRatings) {
      if (otherUserId === userId) continue;

      const similarity = this.computeSimilarity(
        targetRatings,
        otherRatings,
      );

      if (similarity >= CONFIG.MIN_SIMILARITY_SCORE) {
        neighbors.push({ similarity, ratings: otherRatings });
      }
    }

    neighbors.sort((a, b) => b.similarity - a.similarity);
    neighbors.splice(CONFIG.NEIGHBOR_LIMIT);

    const candidates = new Map<
      number,
      { weighted: number; similaritySum: number }
    >();

    for (const neighbor of neighbors) {
      for (const [movieId, rating] of neighbor.ratings) {
        if (targetRatings.has(movieId)) continue;

        if (!candidates.has(movieId)) {
          candidates.set(movieId, {
            weighted: 0,
            similaritySum: 0,
          });
        }

        const entry = candidates.get(movieId)!;
        entry.weighted += rating * neighbor.similarity;
        entry.similaritySum += neighbor.similarity;
      }
    }

    const results: RecommendationResultDto[] = [];

    for (const [movieId, data] of candidates) {
      const predicted =
        data.weighted / data.similaritySum;

      if (predicted < CONFIG.MIN_PREDICTED_SCORE) continue;

      const movie = await this.contentRepository.findOne(movieId);
      if (!movie) continue;

      results.push({
        movie,
        score: predicted,
        strategy: 'Collaborative-Filtering',
      });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private computeSimilarity(
    a: Map<number, number>,
    b: Map<number, number>,
  ): number {
    const common: number[] = [];

    for (const movieId of a.keys()) {
      if (b.has(movieId)) common.push(movieId);
    }

    if (common.length < CONFIG.MINIMAL_COMMON_MOVIES)
      return 0;

    const vecA = common.map((id) => a.get(id)!);
    const vecB = common.map((id) => b.get(id)!);

    return this.mathService.cosineSimilarity(vecA, vecB) || 0;
  }
}
