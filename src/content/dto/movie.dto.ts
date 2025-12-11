import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MovieResponseDto {
    @ApiProperty({ example: 1, description: 'Unique movie id' })
    movieId: number;

    @ApiProperty({ example: 'Inception', description: 'Movie name' })
    title: string;

    @ApiProperty({ example: ['Action', 'Sci-Fi'], description: 'List of genres' })
    genres: string[];
}

export class SearchMovieDto {
    @ApiPropertyOptional({ example: 'Star Wars', description: 'Search by name' })
    @IsOptional()
    @IsString()
    query?: string;

    @ApiPropertyOptional({ example: 'Action', description: 'Filter by genre' })
    @IsOptional()
    @IsString()
    genre?: string;

    @ApiPropertyOptional({ example: 10, description: 'Limit of records per page', default: 20 })
    @IsOptional()
    limit?: number;

    @ApiPropertyOptional({ example: 0, description: 'Pagination offset', default: 0 })
    @IsOptional()
    offset?: number;
}
