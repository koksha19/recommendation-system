import { Test } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { RatingsRepository } from '../../src/ratings/ratings.repository';
import { Rating, RatingSchema } from '../../src/ratings/schemas/rating.schema';
import { connect, Connection } from 'mongoose';

describe('RatingsRepository (Integration)', () => {
  let repository: RatingsRepository;
  let mongod: MongoMemoryServer;
  let connection: Connection;

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
  });

  afterAll(async () => {
    await connection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await connection.collection('ratings').deleteMany({});
  });

  it('should upsert ratings: Insert then Update', async () => {
    const r1 = await repository.upsert(1, 100, 3);
    expect(r1.rating).toBe(3);
    const countAfterInsert = await connection.collection('ratings').countDocuments();
    expect(countAfterInsert).toBe(1);

    const r2 = await repository.upsert(1, 100, 5);
    expect(r2.rating).toBe(5);
    const countAfterUpdate = await connection.collection('ratings').countDocuments();
    expect(countAfterUpdate).toBe(1); // Should remain 1
  });

  it('findAll should return lean objects', async () => {
    await repository.upsert(1, 1, 5);
    await repository.upsert(2, 1, 4);

    const all = await repository.findAll();
    expect(all).toHaveLength(2);
    expect(all[0]).not.toHaveProperty('save');
  });
});
