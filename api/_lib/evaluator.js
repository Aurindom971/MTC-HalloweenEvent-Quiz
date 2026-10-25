/**
 * Normalizes code answers by standardizing line breaks, trimming trailing spaces per line,
 * and trimming leading/trailing blank lines.
 */
export function normalizeCode(code) {
  if (typeof code !== 'string') return '';
  return code
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Normalizes predicted terminal output: string cast, trim whitespace, lowercased.
 */
export function normalizeOutput(output) {
  if (output === null || output === undefined) return '';
  return String(output).trim().toLowerCase();
}

/**
 * Deterministically grades a single user answer against the question's answer_key.
 * DOES NOT execute any user-submitted code.
 *
 * @param {object} questionDef - Master question record containing question_type and answer_key
 * @param {*} userAnswer - User-submitted answer
 * @returns {boolean} Whether the answer is correct
 */
export function evaluateAnswer(questionDef, userAnswer) {
  if (!questionDef || !questionDef.answer_key) return false;
  const { question_type, answer_key } = questionDef;

  if (question_type === 'mcq') {
    // MCQ expects integer choice index
    const expected = answer_key.correctIndex ?? answer_key.correctAnswer;
    const user = typeof userAnswer === 'string' ? parseInt(userAnswer, 10) : userAnswer;
    return typeof expected === 'number' && user === expected;
  }

  if (question_type === 'code') {
    // Code editor expects normalized string match
    const expected = answer_key.expectedCode;
    if (typeof expected !== 'string' || typeof userAnswer !== 'string') return false;
    return normalizeCode(userAnswer) === normalizeCode(expected);
  }

  if (question_type === 'predict_output') {
    // Predict output expects case-insensitive trimmed string match
    const expected = answer_key.expectedOutput;
    const accepted = Array.isArray(answer_key.acceptedAnswers) ? answer_key.acceptedAnswers : [];
    const userNorm = normalizeOutput(userAnswer);
    return [expected, ...accepted].some(candidate => normalizeOutput(candidate) === userNorm);
  }

  return false;
}

/**
 * Calculates score across all seals using master question definitions.
 *
 * @param {Array} questions - Array of master question definitions
 * @param {object} answersBySeal - Object with keys seal_1, seal_2, seal_3, seal_4
 * @returns {{ score: number, totalQuestions: number, results: object }}
 */
export function gradeSubmission(questions, answersBySeal = {}) {
  let score = 0;
  const results = {};

  for (const q of questions) {
    const sealKey = `seal_${q.seal_number}`;
    const sealAnswers = answersBySeal[sealKey] || {};
    const userAnswer = sealAnswers[q.question_key];

    const isCorrect = evaluateAnswer(q, userAnswer);
    if (isCorrect) {
      score += q.points || 1;
    }
    results[q.question_key] = {
      isCorrect,
      points: isCorrect ? (q.points || 1) : 0
    };
  }

  return {
    score,
    totalQuestions: questions.length,
    results
  };
}
