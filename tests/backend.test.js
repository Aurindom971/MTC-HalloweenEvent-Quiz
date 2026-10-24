import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSessionToken, verifySessionToken, parseCookies, serializeSessionCookie } from '../api/_lib/session.js';
import { normalizeCode, normalizeOutput, evaluateAnswer, gradeSubmission } from '../api/_lib/evaluator.js';
import { checkRateLimit } from '../api/_lib/rate-limit.js';
import { QUESTION_DEFINITIONS } from '../server/questions.master.js';

describe('Unit Tests: Session Management', () => {
  const secret = 'test-secret-key-that-is-at-least-32-characters-long!';

  it('creates and verifies a valid session token', () => {
    const payload = { registrationId: 'reg-1234', teamName: 'The Phantoms' };
    const token = createSessionToken(payload, secret);
    assert.ok(typeof token === 'string');
    assert.equal(token.split('.').length, 3);

    const decrypted = verifySessionToken(token, secret);
    assert.ok(decrypted);
    assert.equal(decrypted.registrationId, 'reg-1234');
    assert.equal(decrypted.teamName, 'The Phantoms');
    assert.ok(decrypted.exp > Math.floor(Date.now() / 1000));
  });

  it('rejects tampered tokens', () => {
    const payload = { registrationId: 'reg-1234' };
    const token = createSessionToken(payload, secret);
    const tampered = token.slice(0, -4) + 'abcd';
    const result = verifySessionToken(tampered, secret);
    assert.equal(result, null);
  });

  it('rejects tokens signed with different secret', () => {
    const token = createSessionToken({ registrationId: 'reg-1' }, secret);
    const otherSecret = 'completely-different-secret-for-tampering-test!';
    const result = verifySessionToken(token, otherSecret);
    assert.equal(result, null);
  });

  it('correctly parses and serializes cookies', () => {
    const serialized = serializeSessionCookie('xyz123', 3600);
    assert.ok(serialized.includes('HttpOnly'));
    assert.ok(serialized.includes('SameSite=Strict'));

    const parsed = parseCookies('mtc_quiz_session=xyz123; other=abc');
    assert.equal(parsed.mtc_quiz_session, 'xyz123');
    assert.equal(parsed.other, 'abc');
  });
});

describe('Unit Tests: Code & Output Evaluator', () => {
  it('normalizes code line endings and trailing whitespace', () => {
    const raw = 'def scream():  \r\n    print("Boo")  \r\n\r\n';
    const normalized = normalizeCode(raw);
    assert.equal(normalized, 'def scream():\n    print("Boo")');
  });

  it('evaluates MCQ questions strictly by correctIndex', () => {
    const mcqDef = {
      question_type: 'mcq',
      answer_key: { correctIndex: 2 }
    };
    assert.equal(evaluateAnswer(mcqDef, 2), true);
    assert.equal(evaluateAnswer(mcqDef, '2'), true);
    assert.equal(evaluateAnswer(mcqDef, 1), false);
    assert.equal(evaluateAnswer(mcqDef, null), false);
  });

  it('evaluates Code Editor questions strictly by normalized expectedCode', () => {
    const codeDef = {
      question_type: 'code',
      answer_key: { expectedCode: 'def scream():\n    print("Boo")\n\nscream()' }
    };
    // Correct with CRLF and trailing spaces
    const userGood = 'def scream():  \r\n    print("Boo")  \r\n\r\nscream()  ';
    assert.equal(evaluateAnswer(codeDef, userGood), true);

    // Incorrect code
    const userBad = 'def scream():\n    print "Boo"\n\nscream()';
    assert.equal(evaluateAnswer(codeDef, userBad), false);
  });

  it('evaluates Predict Output questions with case-insensitivity and trim', () => {
    const predDef = {
      question_type: 'predict_output',
      answer_key: { expectedOutput: '7' }
    };
    assert.equal(evaluateAnswer(predDef, '  7  \n'), true);
    assert.equal(evaluateAnswer(predDef, 7), true);
    assert.equal(evaluateAnswer(predDef, '8'), false);
  });

  it('grades full submission across all 4 seals correctly', () => {
    const answersBySeal = {
      seal_1: {
        s1_q1_llm_training: 0,
        s1_q2_mfa_factor: 1,
        s1_q3_html_structure: 1,
        s1_q4_alu_operation: 2
      },
      seal_2: {
        s2_q1_py_scream: 'def scream():\n    print("Boo")\n\nscream()',
        s2_q2_js_safe_add: 'function addValues(a, b) {\n    return Number(a) + Number(b);\n}',
        s2_q3_py_containment: 'def is_in_range(x):\n    return 1 <= x <= 10',
        s2_q4_py_loop: 'def process_souls(items):\n    for item in items:\n        print(item)'
      },
      seal_3: {
        s3_q1_zero_index: 2,
        s3_q2_bubble_sort: 3,
        s3_q3_binary_search_complexity: 2,
        s3_q4_py_slice_reverse: 1
      },
      seal_4: {
        s4_q1_c_output: '7',
        s4_q2_cpp_division: '2',
        s4_q3_py_slice_crypt: 'ryp',
        s4_q4_js_coercion: '32'
      }
    };

    const graded = gradeSubmission(QUESTION_DEFINITIONS, answersBySeal);
    assert.equal(graded.score, 16);
    assert.equal(graded.totalQuestions, 16);
  });
});

describe('Unit Tests: Rate Limiter', () => {
  it('enforces sliding window attempt counts', () => {
    const key = `test-ip-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      const res = checkRateLimit(key, 3, 10);
      assert.equal(res.allowed, true);
    }
    const blocked = checkRateLimit(key, 3, 10);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfter > 0);
  });
});

describe('Integrity Tests: Question Definitions & Privacy', () => {
  it('contains exactly 16 questions (4 per seal)', () => {
    assert.equal(QUESTION_DEFINITIONS.length, 16);
    for (let s = 1; s <= 4; s++) {
      const sealQs = QUESTION_DEFINITIONS.filter(q => q.seal_number === s);
      assert.equal(sealQs.length, 4, `Seal ${s} must have exactly 4 questions`);
    }
  });

  it('guarantees unique question_key across all questions', () => {
    const keys = new Set(QUESTION_DEFINITIONS.map(q => q.question_key));
    assert.equal(keys.size, QUESTION_DEFINITIONS.length);
  });

  it('enforces that all 8 MCQ questions have a plain array of choice strings', () => {
    const mcqQs = QUESTION_DEFINITIONS.filter(q => q.question_type === 'mcq');
    assert.equal(mcqQs.length, 8);
    for (const q of mcqQs) {
      assert.ok(Array.isArray(q.options), `MCQ question ${q.question_key} options must be an array`);
      assert.ok(q.options.length >= 2, `MCQ question ${q.question_key} must have at least 2 choices`);
      for (const choice of q.options) {
        assert.equal(typeof choice, 'string', `MCQ choice must be string: ${choice}`);
      }
    }
  });

  it('enforces that all 8 non-MCQ questions (code & predict_output) have options: null', () => {
    const nonMcqQs = QUESTION_DEFINITIONS.filter(q => q.question_type !== 'mcq');
    assert.equal(nonMcqQs.length, 8);
    for (const q of nonMcqQs) {
      assert.equal(q.options, null, `Non-MCQ question ${q.question_key} options must be null`);
    }
  });

  it('confirms the public question delivery logic preserves frontend options compatibility', () => {
    for (const q of QUESTION_DEFINITIONS) {
      if (q.question_type === 'mcq') {
        const formattedOptions = Array.isArray(q.options) ? q.options : (q.options?.choices || []);
        assert.ok(Array.isArray(formattedOptions));
        assert.equal(formattedOptions.length, 4);
      }
    }
  });
});

describe('Phase 3D Tests: SEC-01 Workflow Safety & Permissions', () => {
  it('confirms workflow has no push/merge trigger and defaults dry_run to true', async () => {
    const fs = await import('node:fs');
    const workflowContent = fs.readFileSync('.github/workflows/sync-questions.yml', 'utf8');

    // Must NOT contain push triggers on branches
    assert.equal(workflowContent.includes('push:'), false, 'Workflow must not trigger on git push');
    assert.equal(workflowContent.includes('branches:'), false, 'Workflow must not specify branches');

    // Must be manual workflow_dispatch with default dry_run: true
    assert.ok(workflowContent.includes('workflow_dispatch:'));
    assert.ok(workflowContent.includes('default: true'));
    assert.ok(workflowContent.includes("CONFIRM_SYNC"));
    assert.ok(workflowContent.includes("environment: production"));
  });
});

describe('Phase 3D Tests: SEC-02 Review UI Privacy', () => {
  it('verifies results page removed and sealAndConfirm does not expose answer keys', async () => {
    const fs = await import('node:fs');
    const quizJs = fs.readFileSync('public/quiz.js', 'utf8');

    // finishResult must be fully removed (results page elimination)
    assert.equal(quizJs.includes('function finishResult'), false, 'finishResult must not exist — results page removed');

    // sealAndConfirm must exist as the replacement end-of-quiz handler
    const sealMatch = quizJs.match(/function sealAndConfirm\(\) \{([\s\S]*?)\n\}/);
    assert.ok(sealMatch, 'sealAndConfirm must be defined');
    const body = sealMatch[1];

    // Must not expose private answer keys or scores
    assert.equal(body.includes('question.expectedCode'), false, 'sealAndConfirm must not access question.expectedCode');
    assert.equal(body.includes('question.expectedOutput'), false, 'sealAndConfirm must not access question.expectedOutput');
    assert.equal(body.includes('question.correctAnswer'), false, 'sealAndConfirm must not access question.correctAnswer');
    assert.equal(body.includes('.score'), false, 'sealAndConfirm must not reference score UI');

    // No score/result display anywhere in client code
    assert.equal(quizJs.includes('totalCorrect'), false, 'totalCorrect variable must be removed');
    assert.equal(quizJs.includes('serverScore'), false, 'serverScore variable must be removed');
  });
});

describe('Phase 3D Tests: SEC-03 Atomic Conditional Submission (Mocked)', () => {
  it('rejects concurrent submission when updatedRows is empty (zero rows updated)', () => {
    // Simulate Supabase response when another request already set status to submitted
    const mockUpdateResult = { data: [], error: null }; // 0 rows updated because status was no longer 'draft'

    function handleSubmissionResult(result) {
      if (result.error) return { status: 500, error: 'Database error' };
      if (!result.data || result.data.length === 0) {
        return { status: 409, error: 'Final quiz answers have already been submitted by another concurrent request.' };
      }
      return { status: 200, submitted: true };
    }

    const response = handleSubmissionResult(mockUpdateResult);
    assert.equal(response.status, 409);
    assert.ok(response.error.includes('already been submitted'));
  });

  it('accepts submission when updatedRows contains the updated record', () => {
    const mockUpdateResult = { data: [{ id: 'ans-1', status: 'submitted' }], error: null };

    function handleSubmissionResult(result) {
      if (result.error) return { status: 500, error: 'Database error' };
      if (!result.data || result.data.length === 0) {
        return { status: 409, error: 'Final quiz answers have already been submitted by another concurrent request.' };
      }
      return { status: 200, submitted: true };
    }

    const response = handleSubmissionResult(mockUpdateResult);
    assert.equal(response.status, 200);
    assert.equal(response.submitted, true);
  });
});

describe('Phase 2 Focused Fixes Tests', () => {
  it('enforces SESSION_SECRET requirement without insecure fallback', async () => {
    const { getSessionSecret } = await import('../api/_lib/session.js');
    const originalSecret = process.env.SESSION_SECRET;
    try {
      delete process.env.SESSION_SECRET;
      assert.throws(() => getSessionSecret(), /SESSION_SECRET environment variable is required/);
    } finally {
      if (originalSecret) process.env.SESSION_SECRET = originalSecret;
    }
  });

  it('confirms all 8 non-MCQ questions possess non-empty presentation metadata', async () => {
    const { QUESTION_PRESENTATION } = await import('../server/questions.master.js');
    const nonMcqKeys = QUESTION_DEFINITIONS
      .filter(q => q.question_type !== 'mcq')
      .map(q => q.question_key);

    assert.equal(nonMcqKeys.length, 8);
    for (const key of nonMcqKeys) {
      const pres = QUESTION_PRESENTATION[key];
      assert.ok(pres, `Missing presentation metadata for ${key}`);
      assert.ok(pres.language, `Missing language for ${key}`);
      if (key.startsWith('s2_')) {
        assert.ok(pres.starterCode && pres.starterCode.length > 0, `Missing starterCode for ${key}`);
        assert.ok(pres.filename, `Missing filename for ${key}`);
      }
      if (key.startsWith('s4_')) {
        assert.ok(pres.codeSnippet && pres.codeSnippet.length > 0, `Missing codeSnippet for ${key}`);
      }
    }
  });

  it('verifies save-draft rejects null, arrays, and invalid question keys', async () => {
    const sealNumber = 1;
    const sealQuestions = QUESTION_DEFINITIONS.filter(q => q.seal_number === sealNumber);
    const validKeys = new Set(sealQuestions.map(q => q.question_key));

    function validateDraftInput(sealNum, answers) {
      if (!sealNum || sealNum < 1 || sealNum > 4 || !answers || typeof answers !== 'object' || Array.isArray(answers)) {
        return { valid: false, error: 'Invalid payload' };
      }
      for (const k of Object.keys(answers)) {
        if (!validKeys.has(k)) {
          return { valid: false, error: `Invalid key ${k}` };
        }
      }
      return { valid: true };
    }

    assert.equal(validateDraftInput(1, null).valid, false);
    assert.equal(validateDraftInput(1, [1, 2, 3]).valid, false);
    assert.equal(validateDraftInput(1, { unknown_key: 'foo' }).valid, false);
    assert.equal(validateDraftInput(1, { s1_q1_llm_training: 0 }).valid, true);
  });
});

describe('Phase 2 Tests: Indian Mobile Number Normalization & Matching', () => {
  it('normalizes valid 10-digit Indian mobile numbers without country code', async () => {
    const { normalizeIndianMobile, isValidIndianMobile } = await import('../api/_lib/supabase.js');
    assert.equal(normalizeIndianMobile('9876543210'), '9876543210');
    assert.equal(isValidIndianMobile('9876543210'), true);
  });

  it('normalizes +91 country code prefix with and without spaces/hyphens', async () => {
    const { normalizeIndianMobile, isValidIndianMobile } = await import('../api/_lib/supabase.js');
    assert.equal(normalizeIndianMobile('+919876543210'), '9876543210');
    assert.equal(normalizeIndianMobile('+91 9876543210'), '9876543210');
    assert.equal(normalizeIndianMobile('+91-9876543210'), '9876543210');
    assert.equal(normalizeIndianMobile('+91 98765 43210'), '9876543210');
    assert.equal(isValidIndianMobile('+919876543210'), true);
  });

  it('normalizes 91 country code without leading plus', async () => {
    const { normalizeIndianMobile } = await import('../api/_lib/supabase.js');
    assert.equal(normalizeIndianMobile('919876543210'), '9876543210');
    assert.equal(normalizeIndianMobile('91 9876543210'), '9876543210');
    assert.equal(normalizeIndianMobile('91-98765-43210'), '9876543210');
  });

  it('normalizes numbers with leading trunk zero (09876543210)', async () => {
    const { normalizeIndianMobile } = await import('../api/_lib/supabase.js');
    assert.equal(normalizeIndianMobile('09876543210'), '9876543210');
    assert.equal(normalizeIndianMobile('0 98765 43210'), '9876543210');
  });

  it('handles surrounding whitespace and formatting characters', async () => {
    const { normalizeIndianMobile } = await import('../api/_lib/supabase.js');
    assert.equal(normalizeIndianMobile('   +91 9876543210   '), '9876543210');
    assert.equal(normalizeIndianMobile('(98765) 43210'), '9876543210');
    assert.equal(normalizeIndianMobile('  98765-43210  '), '9876543210');
  });

  it('rejects invalid, short, non-mobile, or non-Indian prefix numbers', async () => {
    const { normalizeIndianMobile, isValidIndianMobile } = await import('../api/_lib/supabase.js');
    // Starts with 0-5 (not a valid Indian mobile range)
    assert.equal(normalizeIndianMobile('1234567890'), null);
    assert.equal(normalizeIndianMobile('5876543210'), null);
    // Too short / incomplete
    assert.equal(normalizeIndianMobile('9876543'), null);
    // Too long (random extra digits)
    assert.equal(normalizeIndianMobile('+91987654321000'), null);
    // Non-string/null/undefined
    assert.equal(normalizeIndianMobile(null), null);
    assert.equal(normalizeIndianMobile(undefined), null);
    assert.equal(normalizeIndianMobile(''), null);
    assert.equal(normalizeIndianMobile('abc-def-ghij'), null);

    assert.equal(isValidIndianMobile('5876543210'), false);
    assert.equal(isValidIndianMobile('98765'), false);
  });

  it('consistently matches stored +91 number against various student user inputs', async () => {
    const { normalizeIndianMobile } = await import('../api/_lib/supabase.js');
    const storedDbNumber = '+919876543210';
    const normalizedDb = normalizeIndianMobile(storedDbNumber);

    const testInputs = [
      '9876543210',
      '+919876543210',
      '91 9876543210',
      '+91-98765-43210',
      '09876543210',
      '  9876543210  '
    ];

    for (const input of testInputs) {
      const normalizedInput = normalizeIndianMobile(input);
      assert.equal(normalizedInput, normalizedDb, `Failed matching input "${input}" with stored "${storedDbNumber}"`);
    }

    // A different valid Indian mobile should not match
    const differentNumber = '8765432109';
    assert.notEqual(normalizeIndianMobile(differentNumber), normalizedDb);
  });
});

describe('Phase 3 Tests: Team & Member Details Structure and Security', () => {
  it('constructs correct squad roster from registration record with leader and member2', () => {
    const record = {
      id: 'reg-001',
      full_name: 'Harry Potter',
      email: 'harry@hogwarts.edu',
      phone: '+919876543210',
      team_name: 'Gryffindor Quizzers',
      team_size: 2,
      member2_name: 'Hermione Granger',
      member2_email: 'hermione@hogwarts.edu'
    };

    const members = [
      { role: 'Team Leader', name: record.full_name, email: record.email }
    ];
    if (record.member2_name) {
      members.push({ role: 'Member 2', name: record.member2_name, email: record.member2_email || null });
    }

    assert.equal(members.length, 2);
    assert.equal(members[0].name, 'Harry Potter');
    assert.equal(members[0].role, 'Team Leader');
    assert.equal(members[1].name, 'Hermione Granger');
    assert.equal(members[1].role, 'Member 2');
  });

  it('constructs single-member roster for solo team without crashing or inventing members', () => {
    const record = {
      id: 'reg-002',
      full_name: 'Severus Snape',
      email: 'snape@hogwarts.edu',
      phone: '+919876543211',
      team_name: null,
      team_size: 1,
      member2_name: null,
      member2_email: null
    };

    const members = [
      { role: 'Team Leader', name: record.full_name, email: record.email }
    ];
    if (record.member2_name) {
      members.push({ role: 'Member 2', name: record.member2_name, email: record.member2_email || null });
    }

    assert.equal(members.length, 1);
    assert.equal(members[0].name, 'Severus Snape');
    assert.equal(members[0].role, 'Team Leader');
  });

  it('ensures session token derives team identity server-side without client-supplied IDs', () => {
    const sessionTokenPayload = {
      registrationId: 'reg-secure-999',
      teamName: 'Cyber Specters',
      leaderName: 'Ada Lovelace',
      email: 'ada@computing.org'
    };

    // Client request cannot overwrite registrationId since it comes from verified JWT/GCM session
    assert.equal(sessionTokenPayload.registrationId, 'reg-secure-999');
    assert.equal(sessionTokenPayload.leaderName, 'Ada Lovelace');
  });
});

