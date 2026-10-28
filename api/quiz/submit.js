import { getSessionFromRequest, getRuntimeSessionSecret } from '../_lib/session.js';
import { getSupabaseAdmin, normalizeTeamKey, extractSealAnswers, extractAnswerMeta } from '../_lib/supabase.js';
import { gradeSubmission } from '../_lib/evaluator.js';
import { QUESTION_DEFINITIONS } from '../../server/questions.master.js';

let cachedGradingQuestions = null;
let cachedGradingAt = 0;
const GRADING_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

async function getGradingQuestions(supabase) {
  const now = Date.now();
  if (cachedGradingQuestions && now - cachedGradingAt < GRADING_CACHE_TTL_MS) {
    return cachedGradingQuestions;
  }
  try {
    const { data: dbQuestions, error: qError } = await supabase
      .from('questions')
      .select('question_key, seal_number, question_type, answer_key, points')
      .eq('is_active', true);

    const resolved = (!qError && Array.isArray(dbQuestions) && dbQuestions.length > 0)
      ? dbQuestions
      : QUESTION_DEFINITIONS;
    cachedGradingQuestions = resolved;
    cachedGradingAt = now;
    return resolved;
  } catch {
    return QUESTION_DEFINITIONS;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = getRuntimeSessionSecret();
  const session = getSessionFromRequest(req, secret);
  if (!session || !session.registrationId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({ error: 'Invalid JSON request payload' });
      }
    }

    const finalAnswers = body?.answers;
    if (!finalAnswers || typeof finalAnswers !== 'object' || Array.isArray(finalAnswers)) {
      return res.status(400).json({ error: 'Final answers object is required.' });
    }

    const supabase = getSupabaseAdmin();

    // 1. Fetch team answer record to check existing submission status
    const { data: existing, error: fetchError } = await supabase
      .from('team_answers')
      .select('id, status, answers')
      .eq('registration_id', session.registrationId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking team submission status');
      return res.status(500).json({ error: 'Database verification failed' });
    }

    // Reject repeat submissions (Enforcing one final submission per team)
    if (existing?.status === 'submitted') {
      const existingMeta = extractAnswerMeta(existing.answers);
      return res.status(200).json({
        submitted: true,
        alreadySubmitted: true,
        score: existingMeta.r1Score ?? 0,
        totalQuestions: existingMeta.r1Total ?? 20,
        submittedAt: existingMeta.r1SubmittedAt || null
      });
    }

    // 2. Fetch master questions (cached in memory for 100+ simultaneous submissions)
    const gradingQuestions = await getGradingQuestions(supabase);

    // Merge existing saved seal answers with finalAnswers so no previously saved draft answer is lost
    const existingSeals = extractSealAnswers(existing?.answers).sealAnswers;
    const submittedSeals = extractSealAnswers(finalAnswers).sealAnswers;
    const mergedSeals = {
      seal_1: { ...(existingSeals.seal_1 || {}), ...(submittedSeals.seal_1 || {}) },
      seal_2: { ...(existingSeals.seal_2 || {}), ...(submittedSeals.seal_2 || {}) },
      seal_3: { ...(existingSeals.seal_3 || {}), ...(submittedSeals.seal_3 || {}) },
      seal_4: { ...(existingSeals.seal_4 || {}), ...(submittedSeals.seal_4 || {}) }
    };

    // 3. Score submission on server
    const evaluation = gradeSubmission(gradingQuestions, mergedSeals);
    const now = new Date().toISOString();
    const existingMeta = extractAnswerMeta(existing?.answers);
    const { answeredCount } = extractSealAnswers(mergedSeals);

    const payloadToStore = {
      ...mergedSeals,
      _meta: {
        ...existingMeta,
        registrationId: session.registrationId,
        teamName: existingMeta.teamName || session.teamName || null,
        teamKey: existingMeta.teamKey || session.teamKey || normalizeTeamKey(session.teamName || ''),
        leaderName: existingMeta.leaderName || session.leaderName || null,
        leaderEmail: existingMeta.leaderEmail || session.email || null,
        startedAt: existingMeta.startedAt || now,
        lastActiveAt: now,
        currentSeal: 4,
        answeredCount,
        liveScore: evaluation.score,
        r1Score: evaluation.score,
        r1Total: evaluation.totalQuestions,
        r1Results: evaluation.results,
        r1SubmittedAt: now
      }
    };

    // 4. Update or insert submission record with status: 'submitted'
    if (existing) {
      const { data: updatedRows, error: updateError } = await supabase
        .from('team_answers')
        .update({
          status: 'submitted',
          answers: payloadToStore,
          submitted_at: now,
          updated_at: now
        })
        .eq('id', existing.id)
        .eq('status', 'draft')
        .select('id, status');

      if (updateError) {
        console.error('Error finalizing submission in Supabase');
        return res.status(500).json({ error: 'Failed to record final submission' });
      }

      if (!updatedRows || updatedRows.length === 0) {
        return res.status(409).json({ error: 'Final quiz answers have already been submitted by another concurrent request.' });
      }
    } else {
      const { data: insertedRows, error: insertError } = await supabase
        .from('team_answers')
        .insert({
          registration_id: session.registrationId,
          status: 'submitted',
          answers: payloadToStore,
          submitted_at: now,
          created_at: now,
          updated_at: now
        })
        .select('id, status');

      if (insertError) {
        if (insertError.code === '23505') {
          return res.status(409).json({ error: 'Final quiz answers have already been submitted.' });
        }
        console.error('Error creating finalized submission in Supabase');
        return res.status(500).json({ error: 'Failed to record final submission' });
      }

      if (!insertedRows || insertedRows.length === 0) {
        return res.status(500).json({ error: 'Failed to verify submission recording.' });
      }
    }

    return res.status(200).json({
      submitted: true,
      score: evaluation.score,
      totalQuestions: evaluation.totalQuestions,
      submittedAt: now
    });
  } catch (err) {
    console.error('Submit endpoint error:', err.message);
    return res.status(500).json({ error: 'An unexpected internal error occurred.' });
  }
}
