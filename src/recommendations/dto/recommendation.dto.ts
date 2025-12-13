import { ApiProperty } from '@nestjs/swagger';
import { MovieResponseDto } from '../../content/dto/movie.dto';

export class RecommendationResultDto {
  @ApiProperty({ description: 'Recommended movie' })
  movie: MovieResponseDto;

  @ApiProperty({ example: 0.85, description: 'Similarity degree' })
  score: number;

  @ApiProperty({ example: 'Content-Based', description: 'Recommendation strategy' })
  strategy: string;
}
