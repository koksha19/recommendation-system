import { Injectable } from '@nestjs/common';
import { RecommendationOrchestrator } from './orchestrator/recommendation.orchestrator';
import { RecommendationResultDto } from './dto/recommendation.dto';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly orchestrator: RecommendationOrchestrator,
  ) {}

  getContentBasedRecommendations(
    userId: number,
  ): Promise<RecommendationResultDto[]> {
    return this.orchestrator.contentBasedOnly(userId);
  }

  getCollaborativeRecommendations(
    userId: number,
  ): Promise<RecommendationResultDto[]> {
    return this.orchestrator.collaborativeOnly(userId);
  }

  getHybridRecommendations(
    userId: number,
  ): Promise<RecommendationResultDto[]> {
    return this.orchestrator.hybrid(userId);
  }
}
