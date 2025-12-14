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

  public async getContentBasedRecommendations(userId: number, limit: number = 10): Promise<RecommendationResultDto[]> {
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

  public async getCollaborativeRecommendations(userId: number, limit: number = 10): Promise<RecommendationResultDto[]> {
    const allUsersRatings = await this.ratingsService.getAllRatingsGroupedByUser();

    const targetUserRatings = allUsersRatings.get(userId);

    if (!targetUserRatings) {
      this.logger.warn(`User ${userId} has no ratings for Collaborative Filtering.`);
      return [];
    }

    const neighbors: { neighborId: number; similarity: number; ratings: Map<number, number> }[] = [];

    for (const [otherUserId, otherRatings] of allUsersRatings.entries()) {
      if (otherUserId === userId) continue;

      const similarity = this.calculateUserSimilarity(targetUserRatings, otherRatings);

      if (similarity > 0.1) {
        neighbors.push({ neighborId: otherUserId, similarity, ratings: otherRatings });
      }
    }

    neighbors.sort((a, b) => b.similarity - a.similarity).splice(30);

    const candidates = new Map<number, { weightedSum: number; similaritySum: number }>();
    const seenMovies = new Set(targetUserRatings.keys());

    for (const neighbor of neighbors) {
      for (const [movieId, rating] of neighbor.ratings.entries()) {
        if (seenMovies.has(movieId)) continue;

        if (!candidates.has(movieId)) {
          candidates.set(movieId, { weightedSum: 0, similaritySum: 0 });
        }

        const candidate = candidates.get(movieId)!;
        candidate.weightedSum += rating * neighbor.similarity;
        candidate.similaritySum += neighbor.similarity;
      }
    }

    const recommendations: RecommendationResultDto[] = [];

    const topCandidateIds = Array.from(candidates.entries())
      .map(([movieId, data]) => ({ movieId, score: data.weightedSum / data.similaritySum }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(c => c.movieId);

    const moviesData = await Promise.all(topCandidateIds.map(id => this.contentService.findOne(id)));

    for (const movie of moviesData) {
      const data = candidates.get(movie.movieId)!;
      const predictedScore = data.weightedSum / data.similaritySum;

      recommendations.push({
        movie: movie,
        score: predictedScore,
        strategy: 'Collaborative-Filtering'
      });
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  private toOneHotVector(movieGenres: string[], allGenres: string[]): number[] {
    const movieGenreSet = new Set(movieGenres);

    return allGenres.map((genre) => (movieGenreSet.has(genre) ? 1 : 0));
  }

  private calculateUserSimilarity(userA: Map<number, number>, userB: Map<number, number>): number {
    const commonMovieIds: number[] = [];

    for (const movieId of userA.keys()) {
      if (userB.has(movieId)) {
        commonMovieIds.push(movieId);
      }
    }

    if (commonMovieIds.length === 0) return 0;

    const vecA = commonMovieIds.map(id => userA.get(id)!);
    const vecB = commonMovieIds.map(id => userB.get(id)!);

    return this.mathService.cosineSimilarity(vecA, vecB) || 0;
  }
}
