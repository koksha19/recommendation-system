import { Module } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';

import { ContentModule } from '../content/content.module';
import { RatingsModule } from '../ratings/ratings.module';
import { MathModule } from '../common/math/math.module';

@Module({
  imports: [
    ContentModule,
    RatingsModule,
    MathModule,
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
})
export class RecommendationsModule {}
