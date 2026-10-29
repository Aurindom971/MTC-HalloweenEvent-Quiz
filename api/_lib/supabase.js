import { createClient } from '@supabase/supabase-js';
import { createLocalPreviewSupabaseClient } from './local-preview-db.js';

let cachedClient = null;
let cachedAnonClient = null;

/**
 * Returns a public/anon Supabase client.
 * This client has explicit SELECT permissions granted to public.r2_teams and public.r2_config.
 */
export function getSupabaseAnon() {
  if (cachedAnonClient) return cachedAnonClient;

  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim();

  const anonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !anonKey) {
    return getSupabaseAdmin();
  }

  cachedAnonClient = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return cachedAnonClient;
}

/**
 * Returns a trusted Supabase client using Service-Role or Secret key from server environment.
 * The client bypasses public RLS to read registration data and update team answers.
 * Auto-detects URL and keys from any standard environment variable naming convention.
 */
export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim();

  const supabaseKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.LOCAL_PREVIEW === '1') {
      cachedClient = createLocalPreviewSupabaseClient();
      return cachedClient;
    }
    throw new Error(
      'Supabase server credentials missing in process.env. Please configure SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and ' +
      'SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY / SUPABASE_KEY) in your environment variables.'
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return cachedClient;
}

/**
 * Normalizes email: lowercases and trims.
 */
export function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Normalizes an Indian mobile number to a standard 10-digit national number.
 * Handles prefixes such as '+91', '91', '0', leading/trailing whitespace, dashes, and parentheses.
 * Returns null if the resulting number is not a valid 10-digit Indian mobile number (starting with 6-9).
 *
 * @param {string|number} phone
 * @returns {string|null} 10-digit mobile number or null if invalid
 */
export function normalizeIndianMobile(phone) {
  if (phone === null || phone === undefined) return null;
  const raw = String(phone).trim();
  if (!raw) return null;

  // Extract only digit characters
  const digits = raw.replace(/\D/g, '');

  // Check 10-digit number: 6-9 followed by 9 digits
  if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
    return digits;
  }

  // Check 11-digit number starting with trunk prefix '0'
  if (digits.length === 11 && digits.startsWith('0')) {
    const national = digits.slice(1);
    if (/^[6-9]\d{9}$/.test(national)) {
      return national;
    }
  }

  // Check 12-digit number starting with country code '91'
  if (digits.length === 12 && digits.startsWith('91')) {
    const national = digits.slice(2);
    if (/^[6-9]\d{9}$/.test(national)) {
      return national;
    }
  }

  return null;
}

/**
 * Validates whether the input represents a valid Indian mobile number.
 * @param {string|number} phone
 * @returns {boolean}
 */
export function isValidIndianMobile(phone) {
  return normalizeIndianMobile(phone) !== null;
}

/**
 * Normalizes phone number: strips non-digits or standardizes string.
 * Preserved for backward compatibility, returns 10-digit standard Indian mobile if valid,
 * or raw extracted digits.
 */
export function normalizePhone(phone) {
  const normalized = normalizeIndianMobile(phone);
  if (normalized) return normalized;
  if (typeof phone !== 'string' && typeof phone !== 'number') return '';
  return String(phone).replace(/\D/g, '');
}

/**
 * Normalizes a human-readable team name (collapses extra spaces, trims).
 */
export function normalizeTeamName(name) {
  if (typeof name !== 'string') return '';
  return name.replace(/\s+/g, ' ').trim().slice(0, 40);
}

/**
 * Converts a team name into a URL/DB-safe canonical key (matching Round 2 Ledger.teamKey).
 */
export function normalizeTeamKey(name) {
  const clean = normalizeTeamName(name).toLowerCase();
  if (!clean) return '';
  let base = clean;
  try {
    base = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  } catch {
    // ignore normalize errors
  }
  let key = base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!key) {
    key = 't-' + Array.from(clean).map(c => c.codePointAt(0).toString(36)).join('-');
  }
  return key.slice(0, 120);
}

/**
 * Extracts only the seal_1..seal_4 answers from team_answers.answers JSONB,
 * stripping out internal _meta fields so quiz hydration stays clean.
 */
export function extractSealAnswers(answersObj) {
  if (!answersObj || typeof answersObj !== 'object' || Array.isArray(answersObj)) {
    return { sealAnswers: {}, answeredCount: 0, hasDraft: false };
  }
  const sealAnswers = {};
  let answeredCount = 0;
  for (const key of ['seal_1', 'seal_2', 'seal_3', 'seal_4']) {
    if (answersObj[key] && typeof answersObj[key] === 'object' && !Array.isArray(answersObj[key])) {
      sealAnswers[key] = answersObj[key];
      for (const val of Object.values(answersObj[key])) {
        if (typeof val === 'number' || (typeof val === 'string' && val.trim().length > 0)) {
          answeredCount += 1;
        }
      }
    }
  }
  return {
    sealAnswers,
    answeredCount,
    hasDraft: answeredCount > 0
  };
}

/**
 * Extracts _meta object from team_answers.answers JSONB.
 */
export function extractAnswerMeta(answersObj) {
  if (!answersObj || typeof answersObj !== 'object' || Array.isArray(answersObj)) {
    return {};
  }
  const meta = answersObj._meta;
  return meta && typeof meta === 'object' && !Array.isArray(meta) ? meta : {};
}

/**
 * Builds structured squad roster from a registration record.
 */
export function buildMembersList(reg) {
  if (!reg) return [];
  const members = [
    {
      role: 'Team Leader',
      name: reg.full_name || 'Team Leader',
      email: reg.email || null,
      phone: normalizeIndianMobile(reg.phone) || reg.phone || null,
      studentId: reg.student_id || null,
      course: reg.course || null,
      academicYear: reg.academic_year || null
    }
  ];
  if (reg.member2_name) {
    members.push({
      role: 'Member 2',
      name: reg.member2_name,
      email: reg.member2_email || null,
      phone: normalizeIndianMobile(reg.member2_phone) || reg.member2_phone || null
    });
  }
  return members;
}

/**
 * Builds Round 2 leader & members structure from a registration record or metadata.
 */
export function buildRound2Roster(reg, meta = {}) {
  const yearSuffix = y => {
    const n = Number(y);
    if (n === 1) return '1st Year';
    if (n === 2) return '2nd Year';
    if (n === 3) return '3rd Year';
    if (n === 4) return '4th Year';
    return y ? String(y) : '';
  };

  if (reg) {
    const leader = {
      name: reg.full_name || meta.leaderName || 'Team Leader',
      year: yearSuffix(reg.academic_year) || meta.academicYear || '1st Year',
      branch: reg.course || meta.course || 'CSE',
      phone: normalizeIndianMobile(reg.phone) || reg.phone || '',
      email: reg.email || meta.leaderEmail || ''
    };
    const members = [];
    if (reg.member2_name) {
      members.push({
        name: reg.member2_name,
        year: yearSuffix(reg.academic_year) || '1st Year',
        branch: reg.course || 'CSE',
        phone: normalizeIndianMobile(reg.member2_phone) || reg.member2_phone || '',
        email: reg.member2_email || ''
      });
    }
    return { leader, members };
  }

  return {
    leader: meta.leader || {
      name: meta.leaderName || 'Team Leader',
      year: meta.academicYear ? yearSuffix(meta.academicYear) : '1st Year',
      branch: meta.course || 'CSE',
      phone: meta.leaderPhone || '',
      email: meta.leaderEmail || ''
    },
    members: Array.isArray(meta.r2Members) ? meta.r2Members : []
  };
}

/**
 * Robust fetch for r2_teams.
 * Tries service_role client first; if blocked by Postgres permission 42501,
 * falls back to the anon client which has granted SELECT permissions.
 */
export async function fetchR2Teams(supabase) {
  try {
    const res = await supabase.from('r2_teams').select('*');
    if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch {}

  try {
    const anon = getSupabaseAnon();
    const resAnon = await anon.from('r2_teams').select('*');
    if (!resAnon.error && Array.isArray(resAnon.data)) {
      return resAnon.data;
    }
  } catch {}

  return [];
}

/**
 * Reads persistent event configuration.
 * Defaults round2Unlocked to true so participants are never blocked by missing config.
 */
export async function getEventConfig(supabase) {
  let delayMinutes = 15;
  let round2Unlocked = true; // Default unlocked so all participants have immediate access

  // 1. Read persistent configuration stored in questions row '__EVENT_CONFIG__'
  try {
    const { data: qConfig } = await supabase
      .from('questions')
      .select('answer_key')
      .eq('question_key', '__EVENT_CONFIG__')
      .maybeSingle();

    if (qConfig && qConfig.answer_key) {
      if (typeof qConfig.answer_key.delay_minutes === 'number') {
        delayMinutes = qConfig.answer_key.delay_minutes;
      }
      if (typeof qConfig.answer_key.round2_unlocked === 'boolean') {
        round2Unlocked = qConfig.answer_key.round2_unlocked;
      }
      return { delayMinutes, round2Unlocked };
    }
  } catch {}

  // 2. Fall back to r2_config if available via anon client
  try {
    const anon = getSupabaseAnon();
    const { data: r2Cfg } = await anon.from('r2_config').select('*').eq('id', 'event').maybeSingle();
    if (r2Cfg) {
      if (typeof r2Cfg.delay_minutes === 'number') delayMinutes = r2Cfg.delay_minutes;
      if (typeof r2Cfg.round2_unlocked === 'boolean') round2Unlocked = r2Cfg.round2_unlocked;
    }
  } catch {}

  return { delayMinutes, round2Unlocked };
}

/**
 * Persists event configuration.
 * Writes to the questions row '__EVENT_CONFIG__' which service_role can reliably read/write,
 * and makes a best-effort update to r2_config.
 */
export async function setEventConfig(supabase, patch = {}) {
  const current = await getEventConfig(supabase);
  const updated = {
    round2_unlocked: patch.round2Unlocked !== undefined ? Boolean(patch.round2Unlocked) : current.round2Unlocked,
    delay_minutes: patch.delayMinutes !== undefined ? Math.max(0, Math.min(600, Number(patch.delayMinutes))) : current.delayMinutes,
    updated_at: new Date().toISOString()
  };

  try {
    await supabase.from('questions').upsert({
      question_key: '__EVENT_CONFIG__',
      seal_number: 1,
      question_type: 'predict_output',
      question_text: 'EVENT_CONFIG_METADATA',
      options: null,
      answer_key: updated,
      display_order: 999,
      points: 0,
      is_active: false
    }, { onConflict: 'question_key' });
  } catch (err) {
    console.error('setEventConfig failed writing to questions:', err?.message);
  }

  try {
    await supabase.from('r2_config').upsert({
      id: 'event',
      delay_minutes: updated.delay_minutes,
      round2_unlocked: updated.round2_unlocked,
      updated_at: updated.updated_at
    }, { onConflict: 'id' });
  } catch {}

  return {
    round2Unlocked: updated.round2_unlocked,
    delayMinutes: updated.delay_minutes
  };
}
