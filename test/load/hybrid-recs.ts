import http from 'k6/http';
import { check, sleep } from 'k6';
import { Options } from 'k6/options';

export const options: Options = {
  stages: [
    { duration: '10s', target: 10 },
    { duration: '30s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = 'http://host.docker.internal:3000';

export default function () {
  const userId = 613;

  const res = http.get(`${BASE_URL}/api/recommendations/hybrid/${userId}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has recommendations': (r) => {
      const body = JSON.parse(r.body as string) as string;
      return Array.isArray(body) && body.length > 0;
    },
    'is fast (cached)': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
