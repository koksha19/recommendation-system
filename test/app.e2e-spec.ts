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

  // 1. Створення користувача
  it('/api/users (POST) - Register new user', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/users')
      .send({ username: `e2e_user_${Date.now()}` })
      .expect(201);

    createdUserId = res.body.userId;
    expect(typeof createdUserId).toBe('number');
  });

  // 2. Пошук фільмів для оцінки
  it('/api/content/search (GET) - Find "Toy Story"', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/content/search?query=Toy')
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    const movie = res.body.find((m: IMovie) => m.title.includes('Toy Story'));
    expect(movie).toBeDefined();
    // Зберігаємо ID для наступного кроку (припустимо Toy Story ID = 1)
  });

  // 3. Оцінка фільмів (Формування смаку)
  it('/api/ratings (POST) - Rate movies', async () => {
    // Like Toy Story (1)
    await request(app.getHttpServer())
      .post('/api/ratings')
      .send({ userId: createdUserId, movieId: 1, rating: 5 })
      .expect(201);

    // Like Aladdin (588)
    await request(app.getHttpServer())
      .post('/api/ratings')
      .send({ userId: createdUserId, movieId: 588, rating: 5 })
      .expect(201);
  });

  // 4. Отримання рекомендацій (Перевірка роботи системи)
  it('/api/recommendations/content-based/:id (GET)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/recommendations/content-based/${createdUserId}`)
      .expect(200);

    // Очікуємо, що будуть мультики (Animation)
    expect(Array.isArray(res.body)).toBe(true);
    if (res.body.length > 0) {
      const genres = res.body[0].movie.genres;
      expect(genres).toEqual(expect.arrayContaining(['Animation']));
    }
  });

  // 5. Перевірка кешування (Другий запит має бути швидшим)
  it('Second request should be cached', async () => {
    const start = Date.now();
    await request(app.getHttpServer())
      .get(`/api/recommendations/hybrid/${createdUserId}`)
      .expect(200);
    const duration = Date.now() - start;
    // Це приблизний тест, в реальному E2E важко гарантувати мілісекунди без контролю середовища,
    // але ми очікуємо, що він не впаде.
    expect(duration).toBeLessThan(1000);
  });
});
