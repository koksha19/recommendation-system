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

  describe('findCandidates', () => {
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

    it('should respect the limit', async () => {
      const dramas = Array.from({ length: 5 }, (_, i) => ({
        movieId: i + 1,
        title: `Drama ${i}`,
        genres: ['Drama'],
      }));
      await movieModel.create(dramas);

      const result = await repository.findCandidates([], ['Drama'], 3);

      expect(result).toHaveLength(3);
    });

    it('should return empty array if user has seen all candidates', async () => {
      await movieModel.create([
        { movieId: 1, title: 'Matrix', genres: ['Sci-Fi'] },
      ]);

      const result = await repository.findCandidates([1], ['Sci-Fi'], 10);
      expect(result).toEqual([]);
    });
  });

  describe('search', () => {
    it('should filter by title regex (case insensitive)', async () => {
      await movieModel.create([
        { movieId: 1, title: 'Star Wars', genres: ['Sci-Fi'] },
        { movieId: 2, title: 'Star Trek', genres: ['Sci-Fi'] },
        { movieId: 3, title: 'Harry Potter', genres: ['Fantasy'] },
      ]);

      const result = await repository.search(
        { title: { $regex: 'star', $options: 'i' } },
        10,
        0,
      );

      expect(result).toHaveLength(2);
      expect(result.map((m) => m.title).sort()).toEqual(['Star Trek', 'Star Wars']);
    });

    it('should support pagination (limit & offset)', async () => {
      const movies = Array.from({ length: 10 }, (_, i) => ({
        movieId: i,
        title: `Movie ${i}`,
        genres: ['Test'],
      }));
      await movieModel.create(movies);

      const result = await repository.search({}, 3, 5);

      expect(result).toHaveLength(3);
      expect(result[0].movieId).toBe(5);
      expect(result[2].movieId).toBe(7);
    });

    it('should filter by genres exactly', async () => {
      await movieModel.create([
        { movieId: 1, title: 'A', genres: ['Comedy'] },
        { movieId: 2, title: 'B', genres: ['Horror'] },
      ]);

      const result = await repository.search({ genres: 'Horror' }, 10, 0);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('B');
    });
  });

  describe('findOne', () => {
    it('should return correct movie details', async () => {
      await movieModel.create({
        movieId: 100,
        title: 'Inception',
        genres: ['Sci-Fi', 'Thriller'],
      });

      const result = await repository.findOne(100);
      expect(result).toBeDefined();
      expect(result?.title).toBe('Inception');
      expect(result?.genres).toEqual(['Sci-Fi', 'Thriller']);
    });

    it('should return null if movie does not exist', async () => {
      const result = await repository.findOne(999);
      expect(result).toBeNull();
    });
  });

  describe('getGenres', () => {
    it('should return distinct genres list', async () => {
      await movieModel.create([
        { movieId: 1, title: 'A', genres: ['Action', 'Comedy'] },
        { movieId: 2, title: 'B', genres: ['Action', 'Drama'] }, // Action повторюється
        { movieId: 3, title: 'C', genres: ['Horror'] },
      ]);

      const result = await repository.getGenres();

      expect(result.sort()).toEqual(['Action', 'Comedy', 'Drama', 'Horror']);
    });

    it('should return empty array for empty DB', async () => {
      const result = await repository.getGenres();
      expect(result).toEqual([]);
    });
  });
});
