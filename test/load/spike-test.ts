import http from 'k6/http';
import { check, sleep } from 'k6';
import { Options } from 'k6/options';

export const options: Options = {
  stages: [
    { duration: '10s', target: 300 },
    { duration: '1m', target: 300 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.1'],
  },
};

const BASE_URL = 'http://host.docker.internal:3000';

export default function () {
  const userId = 1;
  const res = http.get(`${BASE_URL}/api/recommendations/hybrid/${userId}`);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
