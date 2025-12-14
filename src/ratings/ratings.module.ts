import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RatingsService } from './ratings.service';
import { RatingsController } from './ratings.controller';
import { Rating, RatingSchema } from './schemas/rating.schema';
import { RatingsRepository } from './ratings.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Rating.name, schema: RatingSchema }]),
  ],
  controllers: [RatingsController],
  providers: [RatingsService, RatingsRepository],
  exports: [RatingsService, RatingsRepository],
})
export class RatingsModule {}
