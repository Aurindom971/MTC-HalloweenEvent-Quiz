import { getSessionFromRequest } from '../_lib/session.js';
import { getSupabaseAdmin } from '../_lib/supabase.js';
import { QUESTION_DEFINITIONS } from '../../server/questions.master.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = getSessionFromRequest(req);
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

    // Merge answers into the single JSONB answers object
    const currentAnswers = existing?.answers || {};
    // Merge only supplied question keys so incremental answer saves cannot erase
    // earlier answers from the same seal.
    currentAnswers[`seal_${sealNumber}`] = {
      ...(currentAnswers[`seal_${sealNumber}`] || {}),
      ...sealAnswers
    };

    const now = new Date().toISOString();

    if (existing) {
      // Conditional update: only update if status is still 'draft'
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
      // Insert initial draft row
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
        // Unique violation means another request created the row concurrently
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
      savedAt: now
    });
  } catch (err) {
    console.error('Draft endpoint error:', err.message);
    return res.status(500).json({ error: 'An unexpected internal error occurred.' });
  }
}
