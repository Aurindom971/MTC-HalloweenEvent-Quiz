
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL;

export const options = {
  stages: [
    { duration: '15s', target: 10 },
    { duration: '20s', target: 50 },
    { duration: '20s', target: 100 },
    { duration: '60s', target: 100 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration': ['p(95)<1000'],
    checks: ['rate>0.99'],
  },
};

export default function () {
  const response = http.get(
    `${BASE_URL}/api/quiz/questions`
  );

  check(response, {
    'returns HTTP 200': (r) => r.status === 200,
    'response contains questions': (r) => {
      try {
        const data = r.json();
        return data !== null && data !== undefined;
      } catch (_) {
        return false;
      }
    },
    'does not expose answer keys': (r) =>
      !r.body.includes('answer_key'),
  });

  sleep(1);
}
