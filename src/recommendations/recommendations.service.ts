import { Injectable } from '@nestjs/common';

import { MathService } from '../common/math/math.service';
import { RecommendationResultDto } from './dto/recommendation.dto';
import { RatingsRepository } from '../ratings/ratings.repository';
import { ContentRepository } from '../content/content.repository';
import { IMovie } from '../common/interfaces/movie.interface';
import { IRating } from '../common/interfaces/rating.interface';
import { RatingsService } from '../ratings/ratings.service';
import { CONFIG } from '../common/constants/recommendation.constants';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly ratingsRepository: RatingsRepository,
    private readonly contentRepository: ContentRepository,
    private readonly mathService: MathService,
    private readonly ratingsService: RatingsService,
  ) {}

  public async getContentBasedRecommendations(
    userId: number,
    limit: number = CONFIG.DEFAULT_OUTPUT_LIMIT
  ): Promise<RecommendationResultDto[]> {
    const userRatings: IRating[] = await this.ratingsRepository.findByUser(userId);

    if (!userRatings.length) {
      return [];
    }

    const seenIds = new Set(userRatings.map((rating) => rating.movieId));

    const likedRatings: IRating[] = userRatings.filter(
      (rating) => rating.rating >= CONFIG.POSITIVE_RATING_THRESHOLD
    );

    if (!likedRatings.length) return [];

    const likedMovies: IMovie[] = (await Promise.all(
      likedRatings.map((rating) => this.contentRepository.findOne(rating.movieId))
    )).filter((movie): movie is IMovie => !!movie);

    const allGenres = await this.contentRepository.getGenres();
    const userProfileVector = this.calculateUserProfileVector(likedMovies, allGenres);
    const preferredGenres: string[] = Array.from(new Set(likedMovies.flatMap(movie => movie.genres)));

    const candidates: IMovie[] = await this.contentRepository.findCandidates(
      Array.from(seenIds),
      preferredGenres,
      CONFIG.CONTENT_CANDIDATE_LIMIT
    );

    const recommendations: RecommendationResultDto[] = [];

    for (const candidate of candidates) {
      const candidateVector = this.toOneHotVector(candidate.genres, allGenres);
      const similarity = this.mathService.cosineSimilarity(userProfileVector, candidateVector);

      if (similarity && similarity > CONFIG.MIN_SIMILARITY_SCORE) {
        recommendations.push({
          movie: candidate,
          score: similarity,
          strategy: 'Content-Based',
        });
      }
    }

    return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  public async getCollaborativeRecommendations(
    userId: number,
    limit: number = CONFIG.DEFAULT_OUTPUT_LIMIT
  ): Promise<RecommendationResultDto[]> {
    const allUsersRatings = await this.ratingsService.getAllRatingsGroupedByUser();
    const targetUserRatings = allUsersRatings.get(userId);

    if (!targetUserRatings) {
      return [];
    }

    const neighbors: { neighborId: number; similarity: number; ratings: Map<number, number> }[] = [];

    for (const [otherUserId, otherRatings] of allUsersRatings.entries()) {
      if (otherUserId === userId) {
        continue;
      }

      const similarity = this.calculateUserSimilarity(targetUserRatings, otherRatings);

      if (similarity > CONFIG.MIN_SIMILARITY_SCORE) {
        neighbors.push({ neighborId: otherUserId, similarity, ratings: otherRatings });
      }
    }

    neighbors.sort((a, b) => b.similarity - a.similarity).splice(CONFIG.NEIGHBOR_LIMIT);

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

    const topCandidateIds = Array.from(candidates.entries())
      .map(([movieId, data]) => ({ movieId, score: data.weightedSum / data.similaritySum }))
      .filter(candidate => candidate.score >= CONFIG.MIN_PREDICTED_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(c => c.movieId);

    const moviesData: IMovie[] = (await Promise.all(
      topCandidateIds.map(id => this.contentRepository.findOne(id))
    )).filter((movie): movie is IMovie => !!movie);

    const recommendations: RecommendationResultDto[] = [];

    for (const movie of moviesData) {
      const data = candidates.get(movie.movieId);

      if (!data) {
        continue;
      }

      const predictedScore = data.weightedSum / data.similaritySum;

      recommendations.push({
        movie: movie,
        score: predictedScore,
        strategy: 'Collaborative-Filtering'
      });
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  public async getHybridRecommendations(
    userId: number,
    limit: number = CONFIG.DEFAULT_OUTPUT_LIMIT,
    alpha: number = CONFIG.HYBRID_WEIGHT_ALPHA
  ): Promise<RecommendationResultDto[]> {
    const [contentResults, collabResults] = await Promise.all([
      this.getContentBasedRecommendations(userId, CONFIG.HYBRID_MERGE_LIMIT),
      this.getCollaborativeRecommendations(userId, CONFIG.HYBRID_MERGE_LIMIT),
    ]);

    const hybridMap = new Map<number, { movie: IMovie; contentScore: number; collabScore: number }>();

    for (const item of contentResults) {
      hybridMap.set(item.movie.movieId, {
        movie: item.movie,
        contentScore: item.score,
        collabScore: 0,
      });
    }

    for (const item of collabResults) {
      const movieId = item.movie.movieId;
      const normalizedCollabScore = item.score / 5.0; // Нормалізація 1..5 -> 0..1

      if (hybridMap.has(movieId)) {
        hybridMap.get(movieId)!.collabScore = normalizedCollabScore;
      } else {
        hybridMap.set(movieId, {
          movie: item.movie,
          contentScore: 0,
          collabScore: normalizedCollabScore,
        });
      }
    }

    const hybridResults: RecommendationResultDto[] = [];

    for (const item of hybridMap.values()) {
      const finalScore = (alpha * item.contentScore) + ((1 - alpha) * item.collabScore);

      hybridResults.push({
        movie: item.movie,
        score: finalScore,
        strategy: 'Hybrid',
      });
    }

    return hybridResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateUserProfileVector(likedMovies: IMovie[], allGenres: string[]): number[] {
    const vectorLength = allGenres.length;
    const profileVector = new Array(vectorLength).fill(0);

    for (const movie of likedMovies) {
      const movieVector = this.toOneHotVector(movie.genres, allGenres);
      for (let i = 0; i < vectorLength; i++) {
        profileVector[i] += movieVector[i];
      }
    }

    return profileVector.map(val => val / likedMovies.length);
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

    if (commonMovieIds.length < CONFIG.MINIMAL_COMMON_MOVIES) return 0;

    const vecA = commonMovieIds.map(id => userA.get(id)!);
    const vecB = commonMovieIds.map(id => userB.get(id)!);

    return this.mathService.cosineSimilarity(vecA, vecB) || 0;
  }
}
