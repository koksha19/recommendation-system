import { NestFactory } from '@nestjs/core';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as fs from 'fs';
import csv from 'csv-parser';
import * as path from 'path';

import { Movie, MovieSchema } from './src/content/schemas/movie.schema';
import { User, UserSchema } from './src/users/schemas/user.schema';
import { Rating, RatingSchema } from './src/ratings/schemas/rating.schema';

interface MovieRow {
    movieId: string;
    title: string;
    genres: string;
}

interface RatingRow {
    userId: string;
    movieId: string;
    rating: string;
    timestamp: string;
}

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => ({
                uri: config.get<string>('MONGO_URI'),
            }),
            inject: [ConfigService],
        }),
        MongooseModule.forFeature([
            { name: Movie.name, schema: MovieSchema },
            { name: User.name, schema: UserSchema },
            { name: Rating.name, schema: RatingSchema },
        ]),
    ],
})
class SeedModule {}

async function bootstrap() {
    const appContext = await NestFactory.createApplicationContext(SeedModule);

    const movieModel = appContext.get<Model<Movie>>(getModelToken(Movie.name));
    const userModel = appContext.get<Model<User>>(getModelToken(User.name));
    const ratingModel = appContext.get<Model<Rating>>(getModelToken(Rating.name));

    console.log('Clearing database.');
    await movieModel.deleteMany({});
    await userModel.deleteMany({});
    await ratingModel.deleteMany({});

    console.log('Start movie import.');

    const movies: Omit<Movie, '_id'>[] = [];

    await new Promise<void>((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, 'data', 'movies.csv'))
            .pipe(csv())
            .on('data', (row: MovieRow) => {
                movies.push({
                    movieId: parseInt(row.movieId, 10),
                    title: row.title,
                    genres: row.genres ? row.genres.split('|') : [],
                });
            })
            .on('error', (error) => reject(error))
            .on('end', () => resolve());
    });

    if (movies.length > 0) {
        await movieModel.insertMany(movies);
    }

    console.log(`${movies.length} movies imported.`);
    console.log('Start rating import and users creation.');

    const ratings: Omit<Rating, '_id'>[] = [];
    const userIds = new Set<number>();

    await new Promise<void>((resolve, reject) => {
        fs.createReadStream(path.join(__dirname, 'data', 'ratings.csv'))
            .pipe(csv())
            .on('data', (row: RatingRow) => {
                const uid = parseInt(row.userId, 10);
                userIds.add(uid);
                ratings.push({
                    userId: uid,
                    movieId: parseInt(row.movieId, 10),
                    rating: parseFloat(row.rating),
                    timestamp: parseInt(row.timestamp, 10),
                });
            })
            .on('error', (error) => reject(error))
            .on('end', () => resolve());
    });

    const users: Omit<User, '_id'>[] = Array.from(userIds).map((id) => ({
        userId: id,
        username: `User_${id}`,
    }));

    if (users.length > 0) {
        await userModel.insertMany(users);
    }
    console.log(`${users.length} users created.`);

    const chunkSize = 5000;
    for (let i = 0; i < ratings.length; i += chunkSize) {
        const chunk = ratings.slice(i, i + chunkSize);
        await ratingModel.insertMany(chunk);
        console.log(
            `... ${Math.min(i + chunkSize, ratings.length)} / ${ratings.length} ratings downloaded`,
        );
    }

    console.log('Import finished successfully.');
    await appContext.close();
}

bootstrap();
