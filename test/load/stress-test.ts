import http from 'k6/http';
import { check, sleep } from 'k6';
import { Options } from 'k6/options';

export const options: Options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '2m', target: 200 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1000'],
  },
};

const BASE_URL = 'http://host.docker.internal:3000';

export default function () {
  const userId = Math.floor(Math.random() * 100) + 1;

  const res = http.get(`${BASE_URL}/api/recommendations/hybrid/${userId}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has recommendations': (r) => {
      try {
        const body = JSON.parse(r.body as string);

        return Array.isArray(body);
      } catch (e) {
        return false;
      }
    },
  });

  sleep(1);
}
