import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type RatingDocument = Rating & Document;

@Schema({ timestamps: true })
export class Rating {
  @Prop({ required: true })
  userId: number;

  @Prop({ required: true })
  movieId: number;

  @Prop({ required: true })
  rating: number;

  @Prop()
  timestamp: number;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

RatingSchema.index({ userId: 1, movieId: 1 }, { unique: true });
