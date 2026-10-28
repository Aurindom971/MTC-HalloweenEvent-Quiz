import { getSessionFromRequest, getRuntimeSessionSecret } from '../_lib/session.js';
import { getSupabaseAdmin, normalizeTeamKey, extractSealAnswers, extractAnswerMeta } from '../_lib/supabase.js';
import { gradeSubmission } from '../_lib/evaluator.js';
import { QUESTION_DEFINITIONS } from '../../server/questions.master.js';

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

    const sealNumber = parseInt(body?.sealNumber, 10);
    const sealAnswers = body?.answers;

    if (!sealNumber || sealNumber < 1 || sealNumber > 4 || !sealAnswers || typeof sealAnswers !== 'object' || Array.isArray(sealAnswers)) {
      return res.status(400).json({ error: 'Valid sealNumber (1-4) and answers object are required.' });
    }

    // Validate that all answer keys are strings and belong to valid questions in this seal
    const sealQuestions = QUESTION_DEFINITIONS.filter(q => q.seal_number === sealNumber);
    const validKeys = new Set(sealQuestions.map(q => q.question_key));

    for (const key of Object.keys(sealAnswers)) {
      if (!validKeys.has(key)) {
        return res.status(400).json({ error: `Invalid question key for Seal ${sealNumber}: ${key}` });
      }
    }

    const supabase = getSupabaseAdmin();

    // Check existing answer record for team
    const { data: existing, error: fetchError } = await supabase
      .from('team_answers')
      .select('id, status, answers')
      .eq('registration_id', session.registrationId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing team answer');
      return res.status(500).json({ error: 'Database check failed' });
    }

    if (existing?.status === 'submitted') {
      return res.status(403).json({ error: 'Quiz has already been finalized and cannot be modified.' });
    }

    const now = new Date().toISOString();
    const currentAnswers = { ...(existing?.answers || {}) };
    const existingMeta = extractAnswerMeta(currentAnswers);

    // Merge only supplied question keys so incremental answer saves cannot erase earlier answers
    currentAnswers[`seal_${sealNumber}`] = {
      ...(currentAnswers[`seal_${sealNumber}`] || {}),
      ...sealAnswers
    };

    const { sealAnswers: cleanSeals, answeredCount } = extractSealAnswers(currentAnswers);
    const draftEvaluation = gradeSubmission(QUESTION_DEFINITIONS, cleanSeals);

    currentAnswers._meta = {
      ...existingMeta,
      registrationId: session.registrationId,
      teamName: existingMeta.teamName || session.teamName || null,
      teamKey: existingMeta.teamKey || session.teamKey || normalizeTeamKey(session.teamName || ''),
      leaderName: existingMeta.leaderName || session.leaderName || null,
      leaderEmail: existingMeta.leaderEmail || session.email || null,
      startedAt: existingMeta.startedAt || now,
      lastActiveAt: now,
      currentSeal: Math.max(existingMeta.currentSeal || 1, sealNumber),
      answeredCount,
      liveScore: draftEvaluation.score
    };

    if (existing) {
      const { data: updatedRows, error: updateError } = await supabase
        .from('team_answers')
        .update({
          status: 'draft',
          answers: currentAnswers,
          updated_at: now
        })
        .eq('id', existing.id)
        .eq('status', 'draft')
        .select('id, status');

      if (updateError) {
        console.error('Error updating draft in Supabase');
        return res.status(500).json({ error: 'Failed to save draft progress' });
      }

      if (!updatedRows || updatedRows.length === 0) {
        return res.status(409).json({ error: 'Quiz has already been finalized and draft cannot be saved.' });
      }
    } else {
      const { error: insertError } = await supabase
        .from('team_answers')
        .insert({
          registration_id: session.registrationId,
          status: 'draft',
          answers: currentAnswers,
          created_at: now,
          updated_at: now
        });

      if (insertError) {
        if (insertError.code === '23505') {
          return res.status(409).json({ error: 'Draft conflict: Please retry.' });
        }
        console.error('Error inserting draft in Supabase');
        return res.status(500).json({ error: 'Failed to record draft progress' });
      }
    }

    return res.status(200).json({
      saved: true,
      sealNumber,
      answeredCount,
      savedAt: now
    });
  } catch (err) {
    console.error('Draft endpoint error:', err.message);
    return res.status(500).json({ error: 'An unexpected internal error occurred.' });
  }
}
