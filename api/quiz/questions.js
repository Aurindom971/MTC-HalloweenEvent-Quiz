import { getSessionFromRequest } from '../_lib/session.js';
import { getSupabaseAdmin } from '../_lib/supabase.js';
import { SEAL_METADATA, QUESTION_PRESENTATION } from '../../server/questions.master.js';

export default async function handler(req, res) {
  const handlerStartedAt = Date.now();

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Require active team session
  const session = getSessionFromRequest(req);
  if (!session || !session.registrationId) {
    return res.status(401).json({ error: 'Authentication required. Please verify team leader credentials.' });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Query active questions from public.questions
    const queryStartedAt = Date.now();

    const { data: dbQuestions, error } = await supabase
      .from('questions')
      .select('id, seal_number, question_key, question_type, question_text, options, display_order, points')
      .eq('is_active', true)
      .order('seal_number', { ascending: true })
      .order('display_order', { ascending: true });

    console.log(
      `[questions] Supabase query: ${Date.now() - queryStartedAt}ms`
    );

    if (error) {
      console.error('Error fetching questions from Supabase');
      return res.status(500).json({ error: 'Unable to retrieve quiz questions at this time.' });
    }

    // If database has questions, format them by seal
    const questionsBySeal = {};
    for (const q of (dbQuestions || [])) {
      if (!questionsBySeal[q.seal_number]) {
        questionsBySeal[q.seal_number] = [];
      }

      // Format question for frontend presentation
      const formattedQ = {
        questionKey: q.question_key,
        question: q.question_text
      };

      const pres = QUESTION_PRESENTATION[q.question_key] || {};

      if (q.question_type === 'mcq') {
        formattedQ.options = Array.isArray(q.options) ? q.options : (q.options?.choices || []);
      } else if (q.question_type === 'code') {
        formattedQ.language = pres.language || q.options?.language || 'python';
        formattedQ.filename = pres.filename || q.options?.filename || 'code.py';
        formattedQ.starterCode = pres.starterCode || q.options?.starterCode || '';
        formattedQ.hint = pres.hint || q.options?.hint || '';
      } else if (q.question_type === 'predict_output') {
        formattedQ.language = pres.language || q.options?.language || 'c';
        formattedQ.codeSnippet = pres.codeSnippet || q.options?.codeSnippet || '';
        formattedQ.hint = pres.hint || q.options?.hint || '';
      }

      questionsBySeal[q.seal_number].push(formattedQ);
    }

    // Assemble the complete 4-seal response structure
    const formattingStartedAt = Date.now();

    const seals = SEAL_METADATA.map(meta => {
      const sealQs = questionsBySeal[meta.sealNumber] || [];
      return {
        sealNumber: meta.sealNumber,
        title: meta.title,
        topics: meta.topics,
        briefing: meta.briefing,
        whisper: meta.whisper,
        type: meta.type,
        questions: sealQs
      };
    });

    console.log(
      `[questions] formatting: ${Date.now() - formattingStartedAt}ms`
    );

    console.log(
      `[questions] total handler: ${Date.now() - handlerStartedAt}ms`
    );

    return res.status(200).json({ seals });
  } catch (err) {
    console.error('Questions endpoint error:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve quiz structure.' });
  }
}
