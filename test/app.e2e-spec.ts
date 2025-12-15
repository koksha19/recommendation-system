import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { IMovie } from '../src/common/interfaces/movie.interface';

describe('Full System E2E', () => {
  let app: INestApplication;
  let createdUserId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/users (POST) - Register new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/users')
      .send({ username: `e2e_user_${Date.now()}` })
      .expect(201);

    createdUserId = res.body.userId;
    expect(typeof createdUserId).toBe('number');
  });

  it('/api/content/search (GET) - Find "Toy Story"', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/content/search?query=Toy')
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    const movie = res.body.find((m: IMovie) => m.title.includes('Toy Story'));
    expect(movie).toBeDefined();
  });

  it('/api/ratings (POST) - Rate movies', async () => {
    await request(app.getHttpServer())
      .post('/api/ratings')
      .send({ userId: createdUserId, movieId: 1, rating: 5 })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/ratings')
      .send({ userId: createdUserId, movieId: 588, rating: 5 })
      .expect(201);
  });

  it('/api/recommendations/content-based/:id (GET)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/recommendations/content-based/${createdUserId}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const genres = res.body[0].movie.genres;
      expect(genres).toEqual(expect.arrayContaining(['Animation']));
    }
  });

  it('Second request should be cached', async () => {
    await request(app.getHttpServer())
      .get(`/api/recommendations/hybrid/${createdUserId}`)
      .expect(200);
    const start = Date.now();
    await request(app.getHttpServer())
      .get(`/api/recommendations/hybrid/${createdUserId}`)
      .expect(200);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(1000);
  }, 30000);
});
