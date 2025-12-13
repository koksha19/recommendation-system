import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { CreateRatingDto, RatingResponseDto } from './dto/ratings.dto';

@ApiTags('Ratings')
@Controller('api/ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Rate movie'
  })
  @ApiResponse({
    status: 201,
    description: 'Rate saved successfully',
    type: RatingResponseDto
  })
  async setRating(@Body() createRatingDto: CreateRatingDto): Promise<RatingResponseDto> {
    return this.ratingsService.setRating(createRatingDto);
  }

  @Get('user/:userId')
  @ApiOperation({
    summary: 'Get user ratings'
  })
  @ApiResponse({
    status: 200,
    type: [RatingResponseDto]
  })
  async getUserRatings(@Param('userId', ParseIntPipe) userId: number): Promise<RatingResponseDto[]> {
    return this.ratingsService.getUserRatings(userId);
  }
}
