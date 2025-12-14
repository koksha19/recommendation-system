import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { RecommendationResultDto } from './dto/recommendation.dto';

@ApiTags('Recommendations')
@Controller('api/recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

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
}
