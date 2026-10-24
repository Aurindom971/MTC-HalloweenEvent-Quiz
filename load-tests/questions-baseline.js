
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL;
const TEST_EMAIL = __ENV.TEST_EMAIL;
const TEST_PHONE = __ENV.TEST_PHONE;

export const options = {
  vus: 1,
  iterations: 10,
};

export function setup() {
  const login = http.post(
    `${BASE_URL}/api/auth/verify`,
    JSON.stringify({
      email: TEST_EMAIL,
      phone: TEST_PHONE,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'x-vercel-protection-bypass': __ENV.VERCEL_BYPASS_SECRET,
      },
    }
  );

  if (login.status !== 200) {
    throw new Error(
      `Login failed: HTTP ${login.status}; body=${String(login.body).slice(0, 500)}`
    );
  }

  const cookie = login.headers['Set-Cookie'];

  if (!cookie) {
    throw new Error('No session cookie returned');
  }

  return {
    cookie: cookie.split(';')[0],
  };
}

export default function (data) {
  const response = http.get(
    `${BASE_URL}/api/quiz/questions`,
    {
      headers: {
        Cookie: data.cookie,
        'x-vercel-protection-bypass': __ENV.VERCEL_BYPASS_SECRET,
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
  });
}
