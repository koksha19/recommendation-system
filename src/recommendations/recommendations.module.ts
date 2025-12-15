import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';

import { ContentModule } from '../content/content.module';
import { RatingsModule } from '../ratings/ratings.module';
import { MathModule } from '../common/math/math.module';
import { RecommendationOrchestrator } from './orchestrator/recommendation.orchestrator';
import { ContentBasedStrategy } from './strategies/content-based.strategy';
import { CollaborativeStrategy } from './strategies/collaborative.strategy';
import { PopularityStrategy } from './strategies/popularity.strategy';
import { RecommendationExplainService } from './explain/recommendation-explain.service';

@Module({
  imports: [
    ContentModule,
    RatingsModule,
    MathModule,
  ],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    RecommendationOrchestrator,
    ContentBasedStrategy,
    CollaborativeStrategy,
    PopularityStrategy,
    RecommendationExplainService,
  ],
})
export class RecommendationsModule {}
