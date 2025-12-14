import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { Movie, MovieSchema } from './schemas/movie.schema';
import { ContentRepository } from './content.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Movie.name, schema: MovieSchema }]),
  ],
  controllers: [ContentController],
  providers: [ContentService, ContentRepository],
  exports: [ContentService, ContentRepository],
})
export class ContentModule {}
