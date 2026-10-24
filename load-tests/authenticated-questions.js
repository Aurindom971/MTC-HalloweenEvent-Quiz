
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL;
const TEST_EMAIL = __ENV.TEST_EMAIL;
const TEST_PHONE = __ENV.TEST_PHONE;

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
    http_req_duration: ['p(95)<1000'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  if (!BASE_URL || !TEST_EMAIL || !TEST_PHONE) {
    throw new Error('Set BASE_URL, TEST_EMAIL and TEST_PHONE.');
  }

  // Authenticate once using the dedicated test registration.
  const response = http.post(
    `${BASE_URL}/api/auth/verify`,
    JSON.stringify({
      email: TEST_EMAIL,
      phone: TEST_PHONE,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (response.status !== 200) {
    throw new Error(
      `Test login failed: HTTP ${response.status}. ` +
      'Check the test credentials and local backend.'
    );
  }

  // Keep the cookie private; never print its value.
  const setCookie = response.headers['Set-Cookie'];
  if (!setCookie) {
    throw new Error('Login succeeded but no session cookie was returned.');
  }

  return { cookie: setCookie.split(';')[0] };
}

export default function (data) {
  const response = http.get(
    `${BASE_URL}/api/quiz/questions`,
    {
      headers: { Cookie: data.cookie },
    }
  );

  check(response, {
    'questions return HTTP 200': (r) => r.status === 200,
    'four seals are returned': (r) => {
      try {
        return r.json('seals').length === 4;
      } catch (_) {
        return false;
      }
    },
    'answer keys are not exposed': (r) =>
      !r.body.includes('answer_key'),
  });

  sleep(1);
}
