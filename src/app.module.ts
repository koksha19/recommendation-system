import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ContentModule } from './content/content.module';
import { RatingsModule } from './ratings/ratings.module';
import { MathModule } from './common/math/math.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        MongooseModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                uri: configService.get<string>('MONGO_URI'),
            }),
            inject: [ConfigService],
        }),

        UsersModule,

        ContentModule,

        RatingsModule,

        MathModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
