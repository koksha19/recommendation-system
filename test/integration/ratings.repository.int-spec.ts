import { Test } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RatingsRepository } from '../../src/ratings/ratings.repository';
import { Rating, RatingSchema } from '../../src/ratings/schemas/rating.schema';
import { connect, Connection, Model } from 'mongoose';

describe('RatingsRepository (Integration)', () => {
  let repository: RatingsRepository;
  let mongod: MongoMemoryServer;
  let connection: Connection;
  let ratingModel: Model<Rating>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    connection = (await connect(mongod.getUri())).connection;

    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongod.getUri()),
        MongooseModule.forFeature([{ name: Rating.name, schema: RatingSchema }]),
      ],
      providers: [RatingsRepository],
    }).compile();

    repository = module.get(RatingsRepository);
    ratingModel = module.get(getModelToken(Rating.name));
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await connection.collection('ratings').deleteMany({});
  });

  describe('upsert', () => {
    it('should insert a new rating if it does not exist', async () => {
      const result = await repository.upsert(1, 101, 5);

      expect(result.userId).toBe(1);
      expect(result.movieId).toBe(101);
      expect(result.rating).toBe(5);
      expect(result.timestamp).toBeDefined();

      const count = await ratingModel.countDocuments();
      expect(count).toBe(1);
    });

    it('should update existing rating and update timestamp', async () => {
      const first = await repository.upsert(1, 101, 3);
      const firstTimestamp = first.timestamp;

      await new Promise((resolve) => setTimeout(resolve, 1100));

      const updated = await repository.upsert(1, 101, 5);

      expect(updated.rating).toBe(5);
      expect(updated.timestamp).toBeGreaterThan(firstTimestamp);

      const count = await ratingModel.countDocuments();
      expect(count).toBe(1);
    });

    it('should handle different users rating the same movie', async () => {
      await repository.upsert(1, 100, 5);
      await repository.upsert(2, 100, 1);

      const count = await ratingModel.countDocuments();
      expect(count).toBe(2);
    });
  });

  describe('findByUser', () => {
    it('should return only ratings belonging to the user', async () => {
      await repository.upsert(1, 101, 5);
      await repository.upsert(1, 102, 4);

      await repository.upsert(2, 101, 1);

      const result = await repository.findByUser(1);

      expect(result).toHaveLength(2);
      const movieIds = result.map((r) => r.movieId).sort();
      expect(movieIds).toEqual([101, 102]);
    });

    it('should return empty array if user has no ratings', async () => {
      await repository.upsert(2, 101, 1);
      const result = await repository.findByUser(999);
      expect(result).toEqual([]);
    });
  });

  describe('findAll', () => {
    it('should return all ratings', async () => {
      await repository.upsert(1, 1, 5);
      await repository.upsert(2, 2, 4);
      await repository.upsert(3, 3, 3);

      const all = await repository.findAll();
      expect(all).toHaveLength(3);
    });

    it('should return specific fields (Projection check)', async () => {
      await repository.upsert(1, 100, 5);

      const result = await repository.findAll();
      const rating = result[0];

      expect(rating.userId).toBe(1);
      expect(rating.movieId).toBe(100);
      expect(rating.rating).toBe(5);

      expect(rating.timestamp).toBeUndefined();
    });

    it('should return lean objects (performance check)', async () => {
      await repository.upsert(1, 1, 5);
      const result = await repository.findAll();

      expect(result[0]).not.toHaveProperty('save');
      expect(result[0].constructor.name).not.toBe('model');
    });
  });
});
