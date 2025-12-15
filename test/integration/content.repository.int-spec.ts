import { Test } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ContentRepository } from '../../src/content/content.repository';
import { Movie, MovieSchema } from '../../src/content/schemas/movie.schema';
import { connect, Connection, Model } from 'mongoose';

describe('ContentRepository (Integration)', () => {
  let repository: ContentRepository;
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let movieModel: Model<Movie>;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    mongoConnection = (await connect(uri)).connection;

    const module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([{ name: Movie.name, schema: MovieSchema }]),
      ],
      providers: [ContentRepository],
    }).compile();

    repository = module.get<ContentRepository>(ContentRepository);
    movieModel = module.get(getModelToken(Movie.name));
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await movieModel.deleteMany({});
  });

  it('should find candidates excluding seen movies', async () => {
    await movieModel.create([
      { movieId: 1, title: 'Seen Movie', genres: ['Action'] },
      { movieId: 2, title: 'Unseen Action', genres: ['Action'] },
      { movieId: 3, title: 'Unseen Comedy', genres: ['Comedy'] },
    ]);

    const seenIds = [1];
    const preferredGenres = ['Action'];

    const result = await repository.findCandidates(seenIds, preferredGenres, 10);

    expect(result).toHaveLength(1);
    expect(result[0].movieId).toBe(2);
  });

  it('search should filter by title regex', async () => {
    await movieModel.create([
      { movieId: 1, title: 'Star Wars', genres: ['Sci-Fi'] },
      { movieId: 2, title: 'Star Trek', genres: ['Sci-Fi'] },
      { movieId: 3, title: 'Harry Potter', genres: ['Fantasy'] },
    ]);

    const result = await repository.search({ title: { $regex: 'Star', $options: 'i' } }, 10, 0);

    expect(result).toHaveLength(2);
  });
});
