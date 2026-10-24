
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
        { duration: '30s', target: 600 },
        { duration: '60s', target: 600 },
        { duration: '30s', target: 0 },
    ],
    thresholds: {
        http_req_failed: ['rate<0.01'],
        http_req_duration: ['p(95)<1000'],
        checks: ['rate>0.99'],
    },
};

function bypassHeaders() {
    return {
        'Content-Type': 'application/json',
        'x-vercel-protection-bypass': VERCEL_BYPASS_SECRET,
    };
}

export function setup() {
    if (!BASE_URL || !TEST_EMAIL || !TEST_PHONE || !VERCEL_BYPASS_SECRET) {
        throw new Error(
            'Missing BASE_URL, TEST_EMAIL, TEST_PHONE, or VERCEL_BYPASS_SECRET.'
        );
    }

    const loginResponse = http.post(
        `${BASE_URL}/api/auth/verify`,
        JSON.stringify({
            email: TEST_EMAIL,
            phone: TEST_PHONE,
        }),
        {
            headers: bypassHeaders(),
            tags: { name: 'auth_verify' },
        }
    );

    const loginOK = check(loginResponse, {
        'login returned HTTP 200': (r) => r.status === 200,
    });

    if (!loginOK) {
        throw new Error(`Test login failed: HTTP ${loginResponse.status}`);
    }

    const setCookie =
        loginResponse.headers['Set-Cookie'] ||
        loginResponse.headers['set-cookie'];

    if (!setCookie) {
        throw new Error('Login response did not include a session cookie.');
    }

    return {
        sessionCookie: setCookie.split(';')[0],
    };
}

export default function (data) {
    const response = http.get(`${BASE_URL}/api/quiz/questions`, {
        headers: {
            'x-vercel-protection-bypass': VERCEL_BYPASS_SECRET,
            Cookie: data.sessionCookie,
        },
        tags: { name: 'quiz_questions' },
        timeout: '30s',
    });

    const statusOK = check(response, {
        'questions returned HTTP 200': (r) => r.status === 200,
    });

    let body = null;
    let validJSON = false;

    if (statusOK && response.body) {
        try {
            body = JSON.parse(response.body);
            validJSON = body !== null && typeof body === 'object';
        } catch (_) {
            validJSON = false;
        }
    }

    check(response, {
        'response contains valid JSON': () => validJSON,
        'response contains four seals': () =>
            validJSON &&
            Array.isArray(body.seals) &&
            body.seals.length === 4,
        'answer keys are not exposed': () =>
            validJSON &&
            !JSON.stringify(body).includes('answer_key'),
    });

    sleep(1);
}
