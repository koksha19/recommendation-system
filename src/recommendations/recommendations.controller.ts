import { Controller, Get, Param, ParseIntPipe, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { RecommendationsService } from './recommendations.service';
import { RecommendationResultDto } from './dto/recommendation.dto';
import { RedisInterceptor } from '../redis/redis.interceptor';
import { RecommendationExplainService } from './explain/recommendation-explain.service';

@ApiTags('Recommendations')
@Controller('api/recommendations')
@UseInterceptors(RedisInterceptor)
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
    private readonly explainService: RecommendationExplainService,
  ) {}

  @Get('content-based/:userId')
  @ApiOperation({
    summary: 'Get content based recommendations',
  })
  @ApiResponse({
    status: 200,
    type: [RecommendationResultDto],
  })
  async getContentBased(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<RecommendationResultDto[]> {
    return this.recommendationsService.getContentBasedRecommendations(userId);
  }

  @Get('collaborative/:userId')
  @ApiOperation({
    summary: 'Get recommendations collaboratively',
  })
  @ApiResponse({
    status: 200,
    type: [RecommendationResultDto]
  })
  async getCollaborative(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<RecommendationResultDto[]> {
    return this.recommendationsService.getCollaborativeRecommendations(userId);
  }

  @Get('hybrid/:userId')
  @ApiOperation({
    summary: 'Get hybrid recommendations',
  })
  @ApiResponse({
    status: 200,
    type: [RecommendationResultDto]
  })
  async getHybrid(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<RecommendationResultDto[]> {
    return this.recommendationsService.getHybridRecommendations(userId);
  }

  @Get('explain/:userId/:movieId')
  async explain(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('movieId', ParseIntPipe) movieId: number,
  ) {
    return this.explainService.explain(userId, movieId);
  }
}
