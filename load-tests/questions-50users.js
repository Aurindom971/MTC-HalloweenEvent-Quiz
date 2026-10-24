
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL;
const TEST_EMAIL = __ENV.TEST_EMAIL;
const TEST_PHONE = __ENV.TEST_PHONE;
const VERCEL_BYPASS_SECRET = __ENV.VERCEL_BYPASS_SECRET;

export const options = {
  stages: [
    { duration: '15s', target: 10 },
    { duration: '20s', target: 25 },
    { duration: '20s', target: 50 },
    { duration: '60s', target: 50 },
    { duration: '15s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.99'],
  },
};

const headers = {
  'Content-Type': 'application/json',
  'x-vercel-protection-bypass': VERCEL_BYPASS_SECRET,
};

export function setup() {
  if (!BASE_URL || !TEST_EMAIL || !TEST_PHONE || !VERCEL_BYPASS_SECRET) {
    throw new Error('Required test environment variables are missing');
  }

  const login = http.post(
    `${BASE_URL}/api/auth/verify`,
    JSON.stringify({ email: TEST_EMAIL, phone: TEST_PHONE }),
    { headers }
  );

  if (login.status !== 200) {
    throw new Error(
      `Login failed: HTTP ${login.status}; body=${String(login.body).slice(0, 300)}`
    );
  }

  const cookie = login.headers['Set-Cookie'];
  if (!cookie) throw new Error('No session cookie returned');

  return { cookie: cookie.split(';')[0] };
}

export default function (data) {
  const response = http.get(
    `${BASE_URL}/api/quiz/questions`,
    {
      headers: {
        Cookie: data.cookie,
        'x-vercel-protection-bypass': VERCEL_BYPASS_SECRET,
      },
    }
  );

  check(response, {
    'questions return HTTP 200': (r) => r.status === 200,
    'four seals returned': (r) => {
      try {
        return r.json('seals').length === 4;
      } catch (_) {
        return false;
      }
    },
    'answer keys not exposed': (r) => !r.body.includes('answer_key'),
  });

  sleep(1);
}
