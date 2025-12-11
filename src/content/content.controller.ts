import { Controller, Get, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { SearchMovieDto, MovieResponseDto } from './dto/movie.dto';

@ApiTags('Content')
@Controller('api/content')
export class ContentController {
    constructor(private readonly contentService: ContentService) {}

    @Get('search')
    @ApiOperation({
        summary: 'Search movies by name or genre'
    })
    @ApiResponse({
        status: 200,
        description: 'Список знайдених фільмів',
        type: [MovieResponseDto]
    })
    async search(@Query() query: SearchMovieDto): Promise<MovieResponseDto[]> {
        return this.contentService.search(query);
    }

    @Get('genres')
    @ApiOperation({
        summary: 'Get list of all genres'
    })
    @ApiResponse({
        status: 200,
        description: 'Список жанрів',
        type: [String]
    })
    async getGenres(): Promise<string[]> {
        return this.contentService.getGenres();
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get film by if=d'
    })
    @ApiResponse({
        status: 200,
        description: 'Деталі фільму',
        type: MovieResponseDto
    })
    @ApiResponse({
        status: 404,
        description: 'Фільм не знайдено'
    })
    async getById(@Param('id', ParseIntPipe) id: number): Promise<MovieResponseDto> {
        return this.contentService.findOne(id);
    }
}
