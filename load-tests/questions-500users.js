
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL;
const TEST_EMAIL = __ENV.TEST_EMAIL;
const TEST_PHONE = __ENV.TEST_PHONE;
const VERCEL_BYPASS_SECRET = __ENV.VERCEL_BYPASS_SECRET;

export const options = {
    stages: [
        { duration: '30s', target: 100 },
        { duration: '30s', target: 200 },
        { duration: '30s', target: 300 },
        { duration: '30s', target: 400 },
        { duration: '30s', target: 500 },
        { duration: '60s', target: 500 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<1000'],
        checks: ['rate>0.99'],
    },
};

const bypassHeaders = {
    'Content-Type': 'application/json',
    'x-vercel-protection-bypass': VERCEL_BYPASS_SECRET,
};

export function setup() {
    if (!BASE_URL || !TEST_EMAIL || !TEST_PHONE || !VERCEL_BYPASS_SECRET) {
        throw new Error(
            'Set BASE_URL, TEST_EMAIL, TEST_PHONE, and VERCEL_BYPASS_SECRET.'
        );
    }

    const loginResponse = http.post(
        `${BASE_URL}/api/auth/verify`,
        JSON.stringify({
            email: TEST_EMAIL,
            phone: TEST_PHONE,
        }),
        {
            headers: bypassHeaders,
            tags: { name: 'auth_verify' },
        }
    );

    const loginPassed = check(loginResponse, {
        'login returned 200': (r) => r.status === 200,
    });

    if (!loginPassed) {
        throw new Error(
            `Test login failed with HTTP ${loginResponse.status}. Check the test account and authentication configuration.`
        );
    }

    const setCookie =
        loginResponse.headers['Set-Cookie'] ||
        loginResponse.headers['set-cookie'];

    if (!setCookie) {
        throw new Error('Login succeeded but no session cookie was returned.');
    }

    const sessionCookie = setCookie.split(';')[0];

    return { sessionCookie };
}

export default function (data) {
    const response = http.get(`${BASE_URL}/api/quiz/questions`, {
        headers: {
            'x-vercel-protection-bypass': VERCEL_BYPASS_SECRET,
            Cookie: data.sessionCookie,
        },
        tags: { name: 'quiz_questions' },
    });

    check(response, {
        'questions returned HTTP 200': (r) => r.status === 200,
        'response contains four seals': (r) => {
            try {
                const body = r.json();
                return Array.isArray(body.seals) && body.seals.length === 4;
            } catch (_) {
                return false;
            }
        },
        'answer_key is not exposed': (r) => {
            try {
                const body = JSON.stringify(r.json());
                return !body.includes('answer_key');
            } catch (_) {
                return false;
            }
        },
    });

    sleep(1);
}
