import { IsNumber, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRatingDto {
  @ApiProperty({ example: 1, description: 'User id' })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 1, description: 'Movie id' })
  @IsInt()
  movieId: number;

  @ApiProperty({
    example: 4.5,
    description: 'Rate',
    minimum: 0.5,
    maximum: 5,
  })
  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;
}

export class RatingResponseDto {
  @ApiProperty()
  userId: number;

  @ApiProperty()
  movieId: number;

  @ApiProperty()
  rating: number;

  @ApiProperty()
  timestamp: number;
}
