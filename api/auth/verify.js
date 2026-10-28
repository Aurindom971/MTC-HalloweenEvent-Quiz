import {
  getSupabaseAdmin,
  normalizeEmail,
  normalizeIndianMobile,
  normalizeTeamName,
  normalizeTeamKey,
  extractSealAnswers,
  extractAnswerMeta,
  buildMembersList,
  buildRound2Roster
} from '../_lib/supabase.js';
import {
  createSessionToken,
  serializeSessionCookie,
  getSessionFromRequest,
  getRuntimeSessionSecret
} from '../_lib/session.js';
import { checkRateLimit, getClientIp } from '../_lib/rate-limit.js';

/**
 * Helper to check if a teamKey is already claimed by a DIFFERENT registration.
 */
async function isTeamKeyTaken(supabase, teamKey, currentRegistrationId) {
  if (!teamKey) return false;

  // 1. Check team_answers JSONB _meta
  const { data: allAnswers } = await supabase
    .from('team_answers')
    .select('registration_id, answers');

  for (const row of allAnswers || []) {
    if (currentRegistrationId && String(row.registration_id) === String(currentRegistrationId)) {
      continue;
    }
    const meta = extractAnswerMeta(row.answers);
    const existingKey = meta.teamKey || normalizeTeamKey(meta.teamName || '');
    if (existingKey && existingKey === teamKey) {
      return true;
    }
  }

  // 2. Best-effort check r2_teams table if it exists
  try {
    const { data: r2Row } = await supabase
      .from('r2_teams')
      .select('key, owner, data')
      .eq('key', teamKey)
      .maybeSingle();

    if (r2Row) {
      const r2RegId = r2Row.data?.registrationId;
      if (currentRegistrationId && r2RegId && String(r2RegId) === String(currentRegistrationId)) {
        return false;
      }
      if (currentRegistrationId && r2Row.owner === `reg-${currentRegistrationId}`) {
        return false;
      }
      return true;
    }
  } catch {
    // Ignore if r2_teams table is not created yet
  }

  return false;
}

/**
 * Best-effort sync of team identity & Round 2 roster to r2_teams and registrations.
 */
async function syncTeamEverywhere(supabase, registration, teamName, teamKey, meta, r2Patch = {}) {
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  // 1. Best-effort update registrations.team_name if column exists
  if (registration?.id && teamName) {
    try {
      await supabase
        .from('registrations')
        .update({ team_name: teamName })
        .eq('id', registration.id);
    } catch {
      // Ignore if registrations does not have team_name column
    }
  }

  // 2. Best-effort sync to public.r2_teams so Round 2 has this team ready
  if (teamKey && teamName) {
    try {
      const { leader, members } = buildRound2Roster(registration, meta);
      const { data: existingR2 } = await supabase
        .from('r2_teams')
        .select('key, data')
        .eq('key', teamKey)
        .maybeSingle();

      const mergedData = {
        ...(existingR2?.data || {}),
        ...(meta?.r2 || {}),
        ...r2Patch,
        registrationId: registration?.id || meta?.registrationId || null,
        leader: existingR2?.data?.leader || leader,
        members: existingR2?.data?.members?.length ? existingR2.data.members : members,
        startedAt: existingR2?.data?.startedAt || meta?.r2?.startedAt || nowMs,
        updatedAt: nowMs
      };

      if (existingR2) {
        await supabase
          .from('r2_teams')
          .update({
            name: teamName,
            data: mergedData,
            updated_at: nowIso
          })
          .eq('key', teamKey);
      } else {
        await supabase
          .from('r2_teams')
          .insert({
            key: teamKey,
            name: teamName,
            owner: registration?.id ? `reg-${registration.id}` : `team-${teamKey}`,
            data: mergedData,
            created_at: nowIso,
            updated_at: nowIso
          });
      }
    } catch {
      // Ignore if r2_teams is not set up yet
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
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

    // Rate limiting: per-(IP + user identifier) + high shared-IP burst limit
    // so 100+ students on the same campus Wi-Fi NAT IP can log in simultaneously
    const ip = getClientIp(req);
    const identifier = normalizeEmail(body?.email) || normalizeTeamKey(body?.teamName) || 'session';
    const userLimit = checkRateLimit(`auth:${ip}:${identifier}`, 25, 60);
    const ipBurstLimit = checkRateLimit(`auth-ip:${ip}`, 600, 60);
    if (!userLimit.allowed || !ipBurstLimit.allowed) {
      const retryAfter = !userLimit.allowed ? userLimit.retryAfter : ipBurstLimit.retryAfter;
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Too many authentication attempts. Please try again shortly.' });
    }

    const action = body?.action || 'verify';
    const supabase = getSupabaseAdmin();
    const secret = getRuntimeSessionSecret();

    // =========================================================================
    // ACTION 1: Set or update Official Team Name for an authenticated team
    // =========================================================================
    if (action === 'set_team_name') {
      const session = getSessionFromRequest(req, secret);
      if (!session || !session.registrationId) {
        return res.status(401).json({ error: 'Session expired. Please verify your leader email and phone again.' });
      }

      const rawTeamName = normalizeTeamName(body?.teamName);
      if (!rawTeamName || rawTeamName.length < 2) {
        return res.status(400).json({ error: 'Please enter a valid Team Name (at least 2 characters).' });
      }

      const teamKey = normalizeTeamKey(rawTeamName);
      const taken = await isTeamKeyTaken(supabase, teamKey, session.registrationId);
      if (taken) {
        return res.status(409).json({ error: 'That Team Name is already taken by another squad. Please choose a unique name.' });
      }

      const [regRes, ansRes] = await Promise.all([
        supabase.from('registrations').select('*').eq('id', session.registrationId).maybeSingle(),
        supabase.from('team_answers').select('id, status, submitted_at, answers').eq('registration_id', session.registrationId).maybeSingle()
      ]);

      const reg = regRes.data;
      if (!reg) {
        return res.status(404).json({ error: 'Registration record not found.' });
      }

      const existingAns = ansRes.data;
      const existingMeta = extractAnswerMeta(existingAns?.answers);
      const { sealAnswers, answeredCount, hasDraft } = extractSealAnswers(existingAns?.answers);
      const members = buildMembersList(reg);
      const now = new Date().toISOString();

      const updatedMeta = {
        ...existingMeta,
        registrationId: reg.id,
        teamName: rawTeamName,
        teamKey,
        leaderName: reg.full_name,
        leaderEmail: reg.email,
        leaderPhone: normalizeIndianMobile(reg.phone) || reg.phone,
        studentId: reg.student_id || null,
        course: reg.course || null,
        academicYear: reg.academic_year || null,
        teamSize: reg.team_size || members.length,
        members,
        startedAt: existingMeta.startedAt || now,
        lastActiveAt: now,
        currentSeal: existingMeta.currentSeal || 1
      };

      const updatedAnswersJson = {
        ...(existingAns?.answers || {}),
        _meta: updatedMeta
      };

      if (existingAns) {
        await supabase
          .from('team_answers')
          .update({
            answers: updatedAnswersJson,
            updated_at: now
          })
          .eq('id', existingAns.id);
      } else {
        await supabase
          .from('team_answers')
          .insert({
            registration_id: reg.id,
            status: 'draft',
            answers: updatedAnswersJson,
            created_at: now,
            updated_at: now
          });
      }

      await syncTeamEverywhere(supabase, reg, rawTeamName, teamKey, updatedMeta);

      const isSubmitted = existingAns?.status === 'submitted';
      const token = createSessionToken({
        registrationId: reg.id,
        teamName: rawTeamName,
        teamKey,
        leaderName: reg.full_name,
        email: reg.email
      }, secret);

      res.setHeader('Set-Cookie', serializeSessionCookie(token));

      return res.status(200).json({
        authenticated: true,
        registrationId: reg.id,
        teamName: rawTeamName,
        teamKey,
        needsTeamName: false,
        leaderName: reg.full_name,
        email: reg.email,
        phone: normalizeIndianMobile(reg.phone) || reg.phone,
        course: reg.course || null,
        academicYear: reg.academic_year || null,
        teamSize: reg.team_size || members.length,
        members,
        member2Name: reg.member2_name || null,
        isSubmitted,
        submittedAt: existingAns?.submitted_at || null,
        r1Score: updatedMeta.r1Score ?? null,
        answeredCount,
        currentSeal: updatedMeta.currentSeal || 1,
        hasDraft: !isSubmitted && hasDraft,
        answers: !isSubmitted ? sealAnswers : {},
        r2: updatedMeta.r2 || null
      });
    }

    // =========================================================================
    // ACTION 2: Resume directly by Team Name (if user quit / refreshed / switched)
    // =========================================================================
    if (action === 'resume_team' || (body?.teamName && !body?.email)) {
      const inputTeamName = normalizeTeamName(body?.teamName);
      const targetKey = normalizeTeamKey(inputTeamName);

      if (!inputTeamName || !targetKey) {
        return res.status(400).json({ error: 'Please enter your Team Name to resume.' });
      }

      // 1. Search team_answers for matching _meta.teamKey or _meta.teamName
      const { data: allAnswers, error: ansErr } = await supabase
        .from('team_answers')
        .select('id, registration_id, status, submitted_at, answers');

      if (ansErr) {
        console.error('Supabase team_answers lookup error:', ansErr.message);
        if (ansErr.message && ansErr.message.includes('permission denied')) {
          return res.status(500).json({
            error: 'Database permission denied: Please configure SUPABASE_SERVICE_ROLE_KEY in your Vercel Project Settings.'
          });
        }
        return res.status(500).json({ error: 'Unable to look up team progress right now.' });
      }

      let matchedAnswer = (allAnswers || []).find(row => {
        const meta = extractAnswerMeta(row.answers);
        const key = meta.teamKey || normalizeTeamKey(meta.teamName || '');
        return key === targetKey;
      });

      let matchedReg = null;
      if (matchedAnswer?.registration_id) {
        const { data: regData } = await supabase
          .from('registrations')
          .select('*')
          .eq('id', matchedAnswer.registration_id)
          .maybeSingle();
        matchedReg = regData;
      }

      // 2. Fallback: Check registrations table if team_name column exists
      if (!matchedReg) {
        const { data: regRows } = await supabase.from('registrations').select('*');
        matchedReg = (regRows || []).find(r => {
          const rKey = normalizeTeamKey(r.team_name || '');
          return rKey && rKey === targetKey;
        }) || null;

        if (matchedReg && !matchedAnswer) {
          matchedAnswer = (allAnswers || []).find(a => String(a.registration_id) === String(matchedReg.id)) || null;
        }
      }

      // 3. Fallback: Check r2_teams table
      let r2Record = null;
      try {
        const { data: r2Data } = await supabase
          .from('r2_teams')
          .select('*')
          .eq('key', targetKey)
          .maybeSingle();
        r2Record = r2Data;
      } catch {
        // ignore if r2_teams doesn't exist
      }

      if (!matchedAnswer && !matchedReg && !r2Record) {
        return res.status(404).json({
          error: `Team "${inputTeamName}" was not found. If you haven't started yet, please verify with your Leader Email & Phone first.`
        });
      }

      const meta = extractAnswerMeta(matchedAnswer?.answers);
      const { sealAnswers, answeredCount, hasDraft } = extractSealAnswers(matchedAnswer?.answers);
      const resolvedTeamName = meta.teamName || matchedReg?.team_name || r2Record?.name || inputTeamName;
      const resolvedTeamKey = normalizeTeamKey(resolvedTeamName);
      const isSubmitted = matchedAnswer?.status === 'submitted';
      const members = matchedReg
        ? buildMembersList(matchedReg)
        : (Array.isArray(meta.members) ? meta.members : []);
      const leaderName = matchedReg?.full_name || meta.leaderName || r2Record?.data?.leader?.name || 'Team Leader';
      const leaderEmail = matchedReg?.email || meta.leaderEmail || r2Record?.data?.leader?.email || '';

      const token = createSessionToken({
        registrationId: matchedReg?.id || matchedAnswer?.registration_id || r2Record?.data?.registrationId || `r2-${resolvedTeamKey}`,
        teamName: resolvedTeamName,
        teamKey: resolvedTeamKey,
        leaderName,
        email: leaderEmail
      }, secret);

      res.setHeader('Set-Cookie', serializeSessionCookie(token));

      return res.status(200).json({
        authenticated: true,
        resumed: true,
        registrationId: matchedReg?.id || matchedAnswer?.registration_id || null,
        teamName: resolvedTeamName,
        teamKey: resolvedTeamKey,
        needsTeamName: false,
        leaderName,
        email: leaderEmail,
        phone: normalizeIndianMobile(matchedReg?.phone || meta.leaderPhone) || null,
        course: matchedReg?.course || meta.course || null,
        academicYear: matchedReg?.academic_year || meta.academicYear || null,
        teamSize: matchedReg?.team_size || members.length || 1,
        members,
        member2Name: matchedReg?.member2_name || null,
        isSubmitted,
        submittedAt: matchedAnswer?.submitted_at || null,
        r1Score: meta.r1Score ?? null,
        answeredCount,
        currentSeal: meta.currentSeal || 1,
        hasDraft: !isSubmitted && hasDraft,
        answers: !isSubmitted ? sealAnswers : {},
        r2: r2Record?.data || meta.r2 || null
      });
    }

    // =========================================================================
    // ACTION 3: Standard Leader Email + Phone Verification (+ optional Team Name)
    // =========================================================================
    const email = normalizeEmail(body?.email);
    const inputPhone = normalizeIndianMobile(body?.phone);
    const optionalTeamName = normalizeTeamName(body?.teamName);

    if (!email || !inputPhone) {
      return res.status(400).json({ error: 'Both a valid registered email and 10-digit mobile number are required.' });
    }

    // Query registrations table matching leader email (using * to avoid missing column errors)
    const { data: rows, error: regError } = await supabase
      .from('registrations')
      .select('*')
      .ilike('email', email);

    if (regError) {
      console.error('Supabase registration lookup error:', regError.message);
      if (regError.message && regError.message.includes('permission denied')) {
        return res.status(500).json({
          error: 'Database permission denied: Supabase Row Level Security is active. Please configure SUPABASE_SERVICE_ROLE_KEY in your Vercel Project Settings.'
        });
      }
      return res.status(500).json({ error: 'Authentication service temporarily unavailable.' });
    }

    // Match phone against matched record(s) using consistent Indian mobile normalization
    let matchedRecord = (rows || []).find(
      r => normalizeIndianMobile(r.phone) === inputPhone || normalizeIndianMobile(r.member2_phone) === inputPhone
    );

    // Fallback: check if they entered Member 2's email and phone
    if (!matchedRecord) {
      const { data: m2Rows } = await supabase
        .from('registrations')
        .select('*')
        .ilike('member2_email', email);
      matchedRecord = (m2Rows || []).find(
        r => normalizeIndianMobile(r.member2_phone) === inputPhone || normalizeIndianMobile(r.phone) === inputPhone
      );
    }

    if (!matchedRecord) {
      return res.status(401).json({ error: 'Invalid team leader email or phone number.' });
    }

    // Check if team already has an answers record
    const { data: answerRecord } = await supabase
      .from('team_answers')
      .select('id, status, submitted_at, answers')
      .eq('registration_id', matchedRecord.id)
      .maybeSingle();

    const isSubmitted = answerRecord?.status === 'submitted';
    const existingMeta = extractAnswerMeta(answerRecord?.answers);
    const { sealAnswers, answeredCount, hasDraft } = extractSealAnswers(answerRecord?.answers);
    const members = buildMembersList(matchedRecord);

    let resolvedTeamName = existingMeta.teamName || normalizeTeamName(matchedRecord.team_name) || '';
    let resolvedTeamKey = resolvedTeamName ? normalizeTeamKey(resolvedTeamName) : '';

    // If user also provided a new teamName during verification, validate and save it
    if (optionalTeamName && optionalTeamName.length >= 2) {
      const candidateKey = normalizeTeamKey(optionalTeamName);
      const taken = await isTeamKeyTaken(supabase, candidateKey, matchedRecord.id);
      if (taken) {
        return res.status(409).json({ error: 'That Team Name is already taken by another squad. Please choose another.' });
      }
      resolvedTeamName = optionalTeamName;
      resolvedTeamKey = candidateKey;
    }

    const now = new Date().toISOString();

    // If we have a teamName (either previously saved or just provided), ensure team_answers has _meta persisted
    if (resolvedTeamName) {
      const updatedMeta = {
        ...existingMeta,
        registrationId: matchedRecord.id,
        teamName: resolvedTeamName,
        teamKey: resolvedTeamKey,
        leaderName: matchedRecord.full_name,
        leaderEmail: matchedRecord.email,
        leaderPhone: normalizeIndianMobile(matchedRecord.phone) || matchedRecord.phone,
        studentId: matchedRecord.student_id || null,
        course: matchedRecord.course || null,
        academicYear: matchedRecord.academic_year || null,
        teamSize: matchedRecord.team_size || members.length,
        members,
        startedAt: existingMeta.startedAt || now,
        lastActiveAt: now,
        currentSeal: existingMeta.currentSeal || 1
      };

      const mergedAnswersJson = {
        ...(answerRecord?.answers || {}),
        _meta: updatedMeta
      };

      if (answerRecord) {
        await supabase
          .from('team_answers')
          .update({ answers: mergedAnswersJson, updated_at: now })
          .eq('id', answerRecord.id);
      } else {
        await supabase
          .from('team_answers')
          .insert({
            registration_id: matchedRecord.id,
            status: 'draft',
            answers: mergedAnswersJson,
            created_at: now,
            updated_at: now
          });
      }

      await syncTeamEverywhere(supabase, matchedRecord, resolvedTeamName, resolvedTeamKey, updatedMeta);
    }

    const fallbackDisplayTeamName = resolvedTeamName || `${matchedRecord.full_name}'s Team`;

    // Issue secure session token
    const token = createSessionToken({
      registrationId: matchedRecord.id,
      teamName: fallbackDisplayTeamName,
      teamKey: resolvedTeamKey || normalizeTeamKey(fallbackDisplayTeamName),
      leaderName: matchedRecord.full_name,
      email: matchedRecord.email
    }, secret);

    res.setHeader('Set-Cookie', serializeSessionCookie(token));

    return res.status(200).json({
      authenticated: true,
      registrationId: matchedRecord.id,
      teamName: fallbackDisplayTeamName,
      customTeamName: resolvedTeamName || null,
      teamKey: resolvedTeamKey || null,
      needsTeamName: !resolvedTeamName && !isSubmitted,
      leaderName: matchedRecord.full_name,
      email: matchedRecord.email,
      phone: normalizeIndianMobile(matchedRecord.phone) || matchedRecord.phone,
      course: matchedRecord.course || null,
      academicYear: matchedRecord.academic_year || null,
      teamSize: matchedRecord.team_size || members.length,
      members,
      member2Name: matchedRecord.member2_name || null,
      isSubmitted,
      submittedAt: answerRecord?.submitted_at || null,
      r1Score: existingMeta.r1Score ?? null,
      answeredCount,
      currentSeal: existingMeta.currentSeal || 1,
      hasDraft: !isSubmitted && hasDraft,
      answers: !isSubmitted ? sealAnswers : {},
      r2: existingMeta.r2 || null
    });
  } catch (err) {
    console.error('Verification handler error:', err.message);
    return res.status(500).json({ error: 'An unexpected internal error occurred.' });
  }
}
