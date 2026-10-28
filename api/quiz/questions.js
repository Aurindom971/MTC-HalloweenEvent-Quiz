import { getSessionFromRequest, getRuntimeSessionSecret } from '../_lib/session.js';
import { getSupabaseAdmin } from '../_lib/supabase.js';
import { SEAL_METADATA, QUESTION_PRESENTATION, QUESTION_DEFINITIONS } from '../../server/questions.master.js';

let cachedSeals = null;
let cachedAt = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function buildSealsFromSource(rawQuestions) {
  const questionsBySeal = {};
  for (const q of rawQuestions || []) {
    if (!questionsBySeal[q.seal_number]) {
      questionsBySeal[q.seal_number] = [];
    }

    const formattedQ = {
      questionKey: q.question_key,
      questionType: q.question_type,
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

  return SEAL_METADATA.map(meta => ({
    sealNumber: meta.sealNumber,
    title: meta.title,
    topics: meta.topics,
    briefing: meta.briefing,
    whisper: meta.whisper,
    type: meta.type,
    questions: questionsBySeal[meta.sealNumber] || []
  }));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = getRuntimeSessionSecret();
  const session = getSessionFromRequest(req, secret);
  if (!session || !session.registrationId) {
    return res.status(401).json({ error: 'Authentication required. Please verify team leader credentials.' });
  }

  try {
    const now = Date.now();
    if (cachedSeals && now - cachedAt < CACHE_TTL_MS) {
      return res.status(200).json({ seals: cachedSeals });
    }

    const supabase = getSupabaseAdmin();
    const { data: dbQuestions, error } = await supabase
      .from('questions')
      .select('id, seal_number, question_key, question_type, question_text, options, display_order, points')
      .eq('is_active', true)
      .order('seal_number', { ascending: true })
      .order('display_order', { ascending: true });

    const sourceQuestions = (!error && Array.isArray(dbQuestions) && dbQuestions.length > 0)
      ? dbQuestions
      : QUESTION_DEFINITIONS;

    const seals = buildSealsFromSource(sourceQuestions);
    cachedSeals = seals;
    cachedAt = now;

    return res.status(200).json({ seals });
  } catch (err) {
    console.error('Questions endpoint error:', err.message);
    const fallbackSeals = buildSealsFromSource(QUESTION_DEFINITIONS);
    return res.status(200).json({ seals: fallbackSeals });
  }
}
