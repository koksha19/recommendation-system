import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Options } from 'k6/options';

export const options: Options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<600'],
  },
};

const BASE_URL = 'http://host.docker.internal:3000';

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

export default function () {
  const userId = randomInt(1, 500);
  const movieId = randomInt(1, 100);

  group('1. Search Content', () => {
    const queries = ['Toy', 'Star', 'Love', 'The', 'A'];
    const q = queries[randomInt(0, queries.length - 1)];

    const res = http.get(`${BASE_URL}/api/content/search?query=${q}`);
    check(res, { 'search success': (r) => r.status === 200 });
  });

  sleep(randomInt(1, 3));

  group('2. Rate a Movie (Write)', () => {
    const payload = JSON.stringify({
      userId: userId,
      movieId: movieId,
      rating: randomInt(1, 5),
    });

    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const res = http.post(`${BASE_URL}/api/ratings`, payload, params);
    check(res, { 'rating created': (r) => r.status === 201 });
  });

  sleep(randomInt(1, 2));

  group('3. Get Recommendations (Read)', () => {
    const res = http.get(`${BASE_URL}/api/recommendations/hybrid/${userId}`);

    check(res, {
      'recs status 200': (r) => r.status === 200,
      'recs not empty': (r) => JSON.parse(r.body as string).length > 0
    });
  });
}
