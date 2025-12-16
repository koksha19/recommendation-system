import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { IMovie } from '../src/common/interfaces/movie.interface';

describe('Full System E2E', () => {
  let app: INestApplication;
  let createdUserId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule =
      await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User Registration & Retrieval', () => {
    it('POST /api/users — should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .send({ username: `e2e_user_${Date.now()}` })
        .expect(201);

      expect(res.body).toHaveProperty('userId');
      expect(res.body).toHaveProperty('username');
      expect(typeof res.body.userId).toBe('number');

      createdUserId = res.body.userId;
    });

    it('GET /api/users/:id — should return created user', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/users/${createdUserId}`)
        .expect(200);

      expect(res.body.userId).toBe(createdUserId);
      expect(typeof res.body.username).toBe('string');
    });
  });

  describe('Content Search & Retrieval', () => {
    it('GET /api/content/search — should find "Toy Story"', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/content/search?query=Toy')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const movie = res.body.find(
        (m: IMovie) => m.title.includes('Toy Story'),
      );
      expect(movie).toBeDefined();
      expect(movie.genres).toBeInstanceOf(Array);
    });

    it('GET /api/content/:id — should return movie details', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/content/1')
        .expect(200);

      expect(res.body).toHaveProperty('movieId', 1);
      expect(res.body).toHaveProperty('title');
      expect(res.body.genres).toBeInstanceOf(Array);
    });

    it('GET /api/content/:id — should return 404 for unknown movie', async () => {
      await request(app.getHttpServer())
        .get('/api/content/999999')
        .expect(404);
    });
  });

  describe('Ratings Submission & Update', () => {
    it('POST /api/ratings — should rate multiple movies', async () => {
      await request(app.getHttpServer())
        .post('/api/ratings')
        .send({ userId: createdUserId, movieId: 1, rating: 5 })
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/ratings')
        .send({ userId: createdUserId, movieId: 588, rating: 5 })
        .expect(201);
    });

    it('POST /api/ratings — should update an existing rating', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/ratings')
        .send({ userId: createdUserId, movieId: 1, rating: 4 })
        .expect(201);

      expect(res.body.rating).toBe(4);
    });
  });

  describe('Recommendation Engines', () => {
    it('GET /api/recommendations/content-based/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/recommendations/content-based/${createdUserId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);

      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('movie');
        expect(res.body[0]).toHaveProperty('score');
        expect(res.body[0].strategy).toBe('Content-Based');
      }
    });

    it('GET /api/recommendations/collaborative/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/recommendations/collaborative/${createdUserId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/recommendations/hybrid/:id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/recommendations/hybrid/${createdUserId}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    }, 30000);
  });

  describe('Explainability & Cache', () => {
    it('GET /api/recommendations/explain/:userId/:movieId', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/recommendations/explain/${createdUserId}/1`)
        .expect(200);

      expect(res.body).toHaveProperty('movieId', 1);
      expect(res.body).toHaveProperty('finalScore');
      expect(res.body).toHaveProperty('contentBased');
    });

    it('Second hybrid request should be served faster (cache effect)', async () => {
      await request(app.getHttpServer())
        .get(`/api/recommendations/hybrid/${createdUserId}`)
        .expect(200);

      const start = Date.now();

      await request(app.getHttpServer())
        .get(`/api/recommendations/hybrid/${createdUserId}`)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });
});
