import { getSupabaseAdmin, normalizeEmail, normalizeIndianMobile } from '../_lib/supabase.js';
import { createSessionToken, serializeSessionCookie } from '../_lib/session.js';
import { checkRateLimit, getClientIp } from '../_lib/rate-limit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting by client IP
  const ip = getClientIp(req);
  const rateLimit = checkRateLimit(`auth:${ip}`, 5, 60);
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', String(rateLimit.retryAfter));
    return res.status(429).json({ error: 'Too many authentication attempts. Please try again shortly.' });
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

    const email = normalizeEmail(body?.email);
    const inputPhone = normalizeIndianMobile(body?.phone);

    if (!email || !inputPhone) {
      return res.status(400).json({ error: 'Both a valid registered email and 10-digit mobile number are required.' });
    }

    const supabase = getSupabaseAdmin();

    // Query registrations table matching leader email
    const { data: rows, error: regError } = await supabase
      .from('registrations')
      .select('id, full_name, email, phone, team_name, team_size, member2_name, member2_phone, member2_email')
      .ilike('email', email);

    if (regError) {
      console.error('Supabase registration lookup error');
      return res.status(500).json({ error: 'Authentication service temporarily unavailable.' });
    }

    // Match phone against matched record(s) using consistent Indian mobile normalization
    const matchedRecord = (rows || []).find(r => normalizeIndianMobile(r.phone) === inputPhone);

    if (!matchedRecord) {
      // Generic error: never reveal if email vs phone was incorrect
      return res.status(401).json({ error: 'Invalid team leader email or phone number.' });
    }

    // Check if team already has an answers record
    const { data: answerRecord } = await supabase
      .from('team_answers')
      .select('status, submitted_at, answers')
      .eq('registration_id', matchedRecord.id)
      .maybeSingle();

    const isSubmitted = answerRecord?.status === 'submitted';

    // Issue secure session token
    const token = createSessionToken({
      registrationId: matchedRecord.id,
      teamName: matchedRecord.team_name || matchedRecord.full_name,
      leaderName: matchedRecord.full_name,
      email: matchedRecord.email
    });

    res.setHeader('Set-Cookie', serializeSessionCookie(token));

    // Construct structured team members list
    const members = [
      {
        role: 'Team Leader',
        name: matchedRecord.full_name,
        email: matchedRecord.email
      }
    ];

    if (matchedRecord.member2_name) {
      members.push({
        role: 'Member 2',
        name: matchedRecord.member2_name,
        email: matchedRecord.member2_email || null
      });
    }

    return res.status(200).json({
      authenticated: true,
      teamName: matchedRecord.team_name || `${matchedRecord.full_name}'s Team`,
      leaderName: matchedRecord.full_name,
      email: matchedRecord.email,
      teamSize: matchedRecord.team_size || members.length,
      members,
      member2Name: matchedRecord.member2_name || null,
      isSubmitted,
      submittedAt: answerRecord?.submitted_at || null,
      hasDraft: !isSubmitted && Boolean(answerRecord?.answers && Object.keys(answerRecord.answers).length > 0),
      answers: !isSubmitted ? answerRecord?.answers || {} : {}
    });
  } catch (err) {
    console.error('Verification handler error:', err.message);
    return res.status(500).json({ error: 'An unexpected internal error occurred.' });
  }
}
