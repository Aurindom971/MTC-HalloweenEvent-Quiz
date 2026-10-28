import {
  createSessionToken,
  serializeAdminCookie,
  clearAdminCookie,
  getAdminSessionFromRequest,
  getRuntimeSessionSecret
} from '../_lib/session.js';
import {
  getSupabaseAdmin,
  normalizeIndianMobile,
  normalizeTeamName,
  normalizeTeamKey,
  extractSealAnswers,
  extractAnswerMeta,
  buildMembersList
} from '../_lib/supabase.js';
import { gradeSubmission } from '../_lib/evaluator.js';
import { QUESTION_DEFINITIONS } from '../../server/questions.master.js';

async function verifyAdminCredentials(supabase, email, password) {
  try {
    const dotenv = await import('dotenv');
    dotenv.default?.config?.({ override: true });
  } catch {
    // ignore dotenv errors in serverless runtime (Vercel injects process.env natively)
  }
  const cleanPass = String(password || email || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanPass) return null;

  // 1. Check configured environment admin passwords (strictly from env variables, zero hardcoded passwords in source)
  const envPasswordsRaw = [
    process.env.ADMIN_PASSWORD,
    process.env.ADMIN_SECRET,
    process.env.ADMIN_API_KEY,
    process.env.ADMIN_PASSWORDS
  ].filter(Boolean);

  const allowedPasswords = [];
  for (const raw of envPasswordsRaw) {
    for (const item of String(raw).split(',')) {
      const trimmed = item.trim().toLowerCase();
      if (trimmed) allowedPasswords.push(trimmed);
    }
  }

  if (allowedPasswords.length > 0 && allowedPasswords.includes(cleanPass.toLowerCase())) {
    return { email: cleanEmail.includes('@') ? cleanEmail : 'admin@mtc.amity.edu', method: 'env' };
  }

  // 2. Check Round 2 host login RPC in Supabase if email + password provided
  if (cleanEmail && cleanEmail.includes('@') && supabase?.rpc) {
    try {
      const { data: hostToken, error } = await supabase.rpc('r2_host_login', {
        p_email: cleanEmail,
        p_password: cleanPass
      });
      if (!error && hostToken) {
        return { email: cleanEmail, method: 'r2_host' };
      }
    } catch {
      // ignore if r2_host_login RPC is not installed
    }
  }

  return null;
}

export default async function handler(req, res) {
  const secret = getRuntimeSessionSecret();
  const supabase = getSupabaseAdmin();

  // ===========================================================================
  // POST /api/admin — Admin Login / Logout
  // ===========================================================================
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({ error: 'Invalid JSON request payload' });
        }
      }

      if (body?.action === 'logout') {
        res.setHeader('Set-Cookie', clearAdminCookie());
        return res.status(200).json({ authenticated: false });
      }

      const envPasswordsRaw = [
        process.env.ADMIN_PASSWORD,
        process.env.ADMIN_SECRET,
        process.env.ADMIN_API_KEY,
        process.env.ADMIN_PASSWORDS
      ].filter(Boolean);

      const verified = await verifyAdminCredentials(supabase, body?.email, body?.password);
      if (!verified) {
        if (envPasswordsRaw.length === 0) {
          return res.status(500).json({
            error: 'Server configuration error: ADMIN_PASSWORD environment variable is not configured. Please set ADMIN_PASSWORD in your Vercel Project Settings.'
          });
        }
        return res.status(401).json({ error: 'Invalid admin credentials. Please check your admin password.' });
      }

      const token = createSessionToken({
        role: 'admin',
        admin: verified.email
      }, secret);

      res.setHeader('Set-Cookie', serializeAdminCookie(token));
      return res.status(200).json({
        authenticated: true,
        admin: verified.email
      });
    } catch (err) {
      console.error('Admin auth error:', err.message);
      return res.status(500).json({ error: 'Admin authentication failed.' });
    }
  }

  // Require Admin Session for GET and PATCH
  const adminSession = getAdminSessionFromRequest(req, secret);
  if (!adminSession) {
    if (req.method === 'GET') {
      const urlObj = new URL(req.url, 'http://localhost');
      if (urlObj.searchParams.get('check') === '1') {
        return res.status(200).json({ authenticated: false });
      }
    }
    return res.status(401).json({ error: 'Admin authentication required.' });
  }

  // ===========================================================================
  // GET /api/admin — Fetch all teams, Round 1 marks, Round 2 fates, websites & judging
  // ===========================================================================
  if (req.method === 'GET') {
    try {
      const [regRes, ansRes, qRes] = await Promise.all([
        supabase.from('registrations').select('*').order('created_at', { ascending: false }),
        supabase.from('team_answers').select('*'),
        supabase.from('questions').select('question_key, seal_number, question_type, answer_key, points').eq('is_active', true)
      ]);

      let r2Rows = [];
      try {
        const { data } = await supabase.from('r2_teams').select('*');
        r2Rows = data || [];
      } catch {
        // ignore if r2_teams not present
      }

      let dbWarning = null;
      if (regRes.error) {
        console.warn('Supabase registrations query warning:', regRes.error.message);
        dbWarning = `Database Notice: ${regRes.error.message} on "registrations". If you provided the publishable/anon key, add SUPABASE_SERVICE_ROLE_KEY to your Vercel Project Settings (Supabase Dashboard -> Settings -> API -> service_role secret) to bypass Row Level Security.`;
      } else if (ansRes.error) {
        console.warn('Supabase team_answers query warning:', ansRes.error.message);
        dbWarning = `Database Notice: ${ansRes.error.message} on "team_answers". Please configure SUPABASE_SERVICE_ROLE_KEY in your Vercel Project Settings.`;
      }

      const gradingQuestions = (!qRes.error && Array.isArray(qRes.data) && qRes.data.length > 0)
        ? qRes.data
        : QUESTION_DEFINITIONS;

      const registrations = regRes.data || [];
      const answersList = ansRes.data || [];

      const ansByRegId = new Map();
      for (const a of answersList) {
        if (a.registration_id != null) {
          ansByRegId.set(String(a.registration_id), a);
        }
      }

      const r2ByKey = new Map();
      const matchedR2Keys = new Set();
      for (const r2 of r2Rows) {
        if (r2.key) {
          r2ByKey.set(r2.key, r2);
        }
      }

      const unifiedTeams = [];

      // 1. Build records for all rows in public.registrations
      for (const reg of registrations) {
        const ans = ansByRegId.get(String(reg.id)) || null;
        const meta = extractAnswerMeta(ans?.answers);
        const { sealAnswers, answeredCount, hasDraft } = extractSealAnswers(ans?.answers);

        const customTeamName = meta.teamName || normalizeTeamName(reg.team_name) || '';
        const teamKey = customTeamName ? normalizeTeamKey(customTeamName) : (meta.teamKey || '');
        const r2Row = teamKey ? r2ByKey.get(teamKey) : null;
        if (teamKey && r2Row) matchedR2Keys.add(teamKey);

        const mergedR2 = {
          ...(r2Row?.data || {}),
          ...(meta.r2 || {})
        };

        const mergedJudging = {
          ...(r2Row?.data?.judging || {}),
          ...(meta.judging || {})
        };

        // Compute or read Round 1 score (/20)
        const isSubmitted = Boolean(ans?.submitted || ans?.status === 'submitted');
        let r1Score = null;
        if (ans && (isSubmitted || hasDraft)) {
          if (typeof meta.r1Score === 'number' && isSubmitted) {
            r1Score = meta.r1Score;
          } else {
            r1Score = gradeSubmission(gradingQuestions, sealAnswers).score;
          }
        }

        const r1Status = isSubmitted
          ? 'submitted'
          : (ans && (hasDraft || customTeamName))
          ? 'in_progress'
          : 'not_started';

        const judgeScore = typeof mergedJudging.score === 'number' ? mergedJudging.score : null;
        const totalScore = Math.round(((r1Score || 0) + (judgeScore || 0)) * 100) / 100;
        const r1CurrentSeal = meta.currentSeal || (isSubmitted ? 4 : 1);
        const r2Started = Boolean(mergedR2.stage || mergedR2.charId || r2Row);
        const cleanPhone = normalizeIndianMobile(reg.phone) || reg.phone || null;

        unifiedTeams.push({
          id: `reg-${reg.id}`,
          registrationId: reg.id,
          registrationCode: reg.registration_code || null,
          teamName: customTeamName || r2Row?.name || `${reg.full_name}'s Team`,
          hasCustomTeamName: Boolean(customTeamName || r2Row?.name),
          teamKey: teamKey || normalizeTeamKey(reg.full_name),
          leaderName: reg.full_name,
          studentId: reg.student_id || null,
          phone: cleanPhone,
          leaderPhone: cleanPhone,
          email: reg.email || null,
          leaderEmail: reg.email || null,
          course: reg.course || null,
          academicYear: reg.academic_year || null,
          teamSize: reg.team_size || (reg.member2_name ? 2 : 1),
          member2Name: reg.member2_name || null,
          member2Phone: normalizeIndianMobile(reg.member2_phone) || reg.member2_phone || null,
          member2Email: reg.member2_email || null,
          members: buildMembersList(reg),
          registeredAt: reg.created_at || null,
          startedAt: meta.startedAt || ans?.created_at || null,
          lastActiveAt: meta.lastActiveAt || ans?.updated_at || r2Row?.updated_at || null,
          r1Status,
          r1CurrentSeal,
          r1AnsweredCount: answeredCount,
          r1Score: r1Score ?? 0,
          r1Total: gradingQuestions.length,
          r1UpdatedAt: meta.lastActiveAt || ans?.updated_at || null,
          r2Started,
          r1: {
            status: r1Status,
            currentSeal: r1CurrentSeal,
            answeredCount,
            totalQuestions: gradingQuestions.length,
            score: r1Score,
            submittedAt: ans?.submitted_at || meta.r1SubmittedAt || null
          },
          r2: {
            started: r2Started,
            stage: mergedR2.stage || null,
            charId: mergedR2.charId || null,
            problem: typeof mergedR2.problem === 'number' ? mergedR2.problem : null,
            hex: typeof mergedR2.hex === 'number' ? mergedR2.hex : null,
            hexAt: mergedR2.hexAt || null,
            unlockAt: mergedR2.unlockAt || null,
            twist: typeof mergedR2.twist === 'number' ? mergedR2.twist : null,
            twistText: mergedR2.twistText || null,
            eggsCount: Array.isArray(mergedR2.eggs) ? mergedR2.eggs.length : 0,
            eggs: Array.isArray(mergedR2.eggs) ? mergedR2.eggs : [],
            submissionUrl: mergedR2.submissionUrl || null,
            repoUrl: mergedR2.repoUrl || null,
            zipUrl: mergedR2.zipUrl || null,
            zipName: mergedR2.zipName || null,
            zipCloudUrl: mergedR2.zipCloudUrl || null,
            submittedAt: mergedR2.submittedAt || null
          },
          judging: {
            score: judgeScore,
            description: mergedJudging.description || '',
            judgedAt: mergedJudging.judgedAt || null,
            updatedAt: mergedJudging.judgedAt || null,
            judgedBy: mergedJudging.judgedBy || null,
            judgeName: mergedJudging.judgedBy || null
          },
          totalScore,
          totalCombinedScore: totalScore
        });
      }

      // 2. Include any standalone r2_teams rows that were registered directly in Round 2
      for (const r2 of r2Rows) {
        if (matchedR2Keys.has(r2.key)) continue;
        const d = r2.data || {};
        const ldr = d.leader || {};
        const mem0 = Array.isArray(d.members) && d.members[0] ? d.members[0] : null;
        const judging = d.judging || {};
        const judgeScore = typeof judging.score === 'number' ? judging.score : null;

        unifiedTeams.push({
          id: `r2-${r2.key}`,
          registrationId: d.registrationId || null,
          registrationCode: null,
          teamName: r2.name || r2.key,
          hasCustomTeamName: true,
          teamKey: r2.key,
          leaderName: ldr.name || 'Team Leader',
          studentId: null,
          phone: ldr.phone || null,
          leaderPhone: ldr.phone || null,
          email: ldr.email || null,
          leaderEmail: ldr.email || null,
          course: ldr.branch || null,
          academicYear: ldr.year || null,
          teamSize: (Array.isArray(d.members) ? d.members.length : 0) + 1,
          member2Name: mem0?.name || null,
          member2Phone: mem0?.phone || null,
          member2Email: mem0?.email || null,
          members: [
            { role: 'Team Leader', name: ldr.name || 'Team Leader', email: ldr.email || null },
            ...(mem0 ? [{ role: 'Member 2', name: mem0.name, email: mem0.email || null }] : [])
          ],
          registeredAt: r2.created_at || null,
          startedAt: d.startedAt ? new Date(d.startedAt).toISOString() : r2.created_at,
          lastActiveAt: r2.updated_at || null,
          r1Status: 'not_started',
          r1CurrentSeal: 0,
          r1AnsweredCount: 0,
          r1Score: 0,
          r1Total: gradingQuestions.length,
          r1UpdatedAt: r2.updated_at || null,
          r2Started: true,
          r1: {
            status: 'not_started',
            currentSeal: 0,
            answeredCount: 0,
            totalQuestions: gradingQuestions.length,
            score: null,
            submittedAt: null
          },
          r2: {
            started: true,
            stage: d.stage || 'soul',
            charId: d.charId || null,
            problem: typeof d.problem === 'number' ? d.problem : null,
            hex: typeof d.hex === 'number' ? d.hex : null,
            hexAt: d.hexAt || null,
            unlockAt: d.unlockAt || null,
            twist: typeof d.twist === 'number' ? d.twist : null,
            twistText: d.twistText || null,
            eggsCount: Array.isArray(d.eggs) ? d.eggs.length : 0,
            eggs: Array.isArray(d.eggs) ? d.eggs : [],
            submissionUrl: d.submissionUrl || null,
            repoUrl: d.repoUrl || null,
            zipUrl: d.zipUrl || null,
            zipName: d.zipName || null,
            zipCloudUrl: d.zipCloudUrl || null,
            submittedAt: d.submittedAt || null
          },
          judging: {
            score: judgeScore,
            description: judging.description || '',
            judgedAt: judging.judgedAt || null,
            updatedAt: judging.judgedAt || null,
            judgedBy: judging.judgedBy || null,
            judgeName: judging.judgedBy || null
          },
          totalScore: judgeScore || 0,
          totalCombinedScore: judgeScore || 0
        });
      }

      const summary = {
        totalRegistered: unifiedTeams.length,
        r1Started: unifiedTeams.filter(t => t.r1Status === 'in_progress' || t.r1Status === 'submitted').length,
        r1Submitted: unifiedTeams.filter(t => t.r1Status === 'submitted').length,
        r2Active: unifiedTeams.filter(t => t.r2Started).length,
        r2Submitted: unifiedTeams.filter(t => Boolean(t.r2?.submissionUrl || t.r2?.zipUrl || t.r2?.zipCloudUrl || t.r2?.repoUrl)).length,
        judgedCount: unifiedTeams.filter(t => typeof t.judging?.score === 'number').length
      };

      let r2DelayMinutes = 15;
      try {
        const { data: cfgData } = await supabase.from('r2_config').select('delay_minutes').eq('id', 'event').maybeSingle();
        if (cfgData && typeof cfgData.delay_minutes === 'number') {
          r2DelayMinutes = cfgData.delay_minutes;
        }
      } catch {
        // ignore if r2_config not present
      }

      return res.status(200).json({
        authenticated: true,
        admin: adminSession.admin,
        r2DelayMinutes,
        summary,
        teams: unifiedTeams,
        dbWarning: dbWarning || null,
        dbStatus: {
          connected: !regRes.error && !ansRes.error,
          source: process.env.LOCAL_PREVIEW === '1' ? 'local_preview' : 'supabase',
          registrationsCount: registrations.length,
          answersCount: answersList.length,
          r2TeamsCount: r2Rows.length
        }
      });
    } catch (err) {
      console.error('Admin GET error:', err.message);
      return res.status(500).json({ error: 'Failed to load admin dashboard data.' });
    }
  }

  // ===========================================================================
  // PATCH /api/admin — Save Judge Score (0-10) & Description or Manage Team
  // ===========================================================================
  if (req.method === 'PATCH') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({ error: 'Invalid JSON request payload' });
        }
      }

      const action = body?.action || 'save_judgment';
      const registrationId = body?.registrationId;
      const teamKey = normalizeTeamKey(body?.teamKey || body?.teamName || '');
      const nowIso = new Date().toISOString();

      if (action === 'set_r2_delay') {
        const mins = Math.max(0, Math.min(600, Number(body?.delayMinutes) || 0));
        try {
          await supabase
            .from('r2_config')
            .upsert({ id: 'event', delay_minutes: mins, updated_at: nowIso }, { onConflict: 'id' });
        } catch {
          // ignore if r2_config table not present
        }
        return res.status(200).json({ ok: true, delayMinutes: mins });
      }

      if (action === 'unlock_r1' && registrationId) {
        const { error } = await supabase
          .from('team_answers')
          .update({ submitted: false, status: 'draft', updated_at: nowIso })
          .eq('registration_id', registrationId);
        if (error) {
          await supabase
            .from('team_answers')
            .update({ submitted: false, updated_at: nowIso })
            .eq('registration_id', registrationId);
        }
        return res.status(200).json({ ok: true });
      }

      // Validate judgeScore (0 to 10, or null to clear)
      const rawScoreVal = body?.judgeScore !== undefined ? body.judgeScore : body?.score;
      let parsedScore = null;
      if (rawScoreVal !== null && rawScoreVal !== undefined && String(rawScoreVal).trim() !== '') {
        const num = Number(rawScoreVal);
        if (Number.isNaN(num) || num < 0 || num > 10) {
          return res.status(400).json({ error: 'Judge score must be a number between 0 and 10.' });
        }
        parsedScore = Math.round(num * 100) / 100;
      }

      const rawDescVal = typeof body?.judgeDescription === 'string' ? body.judgeDescription : body?.description;
      const description = typeof rawDescVal === 'string'
        ? rawDescVal.trim().slice(0, 2000)
        : '';

      const judgeByVal = (typeof body?.judgeName === 'string' && body.judgeName.trim())
        ? body.judgeName.trim().slice(0, 80)
        : (adminSession.admin || 'Admin');

      const judgingObj = {
        score: parsedScore,
        description,
        judgedAt: nowIso,
        updatedAt: nowIso,
        judgedBy: judgeByVal,
        judgeName: judgeByVal
      };

      // 1. Save in public.team_answers if registrationId is present
      if (registrationId && !String(registrationId).startsWith('r2-')) {
        const { data: existingAns } = await supabase
          .from('team_answers')
          .select('id, answers')
          .eq('registration_id', registrationId)
          .maybeSingle();

        const existingMeta = extractAnswerMeta(existingAns?.answers);
        const updatedAnswers = {
          ...(existingAns?.answers || {}),
          _meta: {
            ...existingMeta,
            teamName: existingMeta.teamName || normalizeTeamName(body?.teamName) || null,
            teamKey: existingMeta.teamKey || teamKey || null,
            judging: judgingObj
          }
        };

        if (existingAns) {
          await supabase
            .from('team_answers')
            .update({ answers: updatedAnswers, updated_at: nowIso })
            .eq('id', existingAns.id);
        } else {
          await supabase
            .from('team_answers')
            .insert({
              registration_id: registrationId,
              status: 'draft',
              answers: updatedAnswers,
              created_at: nowIso,
              updated_at: nowIso
            });
        }
      }

      // 2. Also save in public.r2_teams if teamKey is present
      if (teamKey) {
        try {
          const { data: r2Row } = await supabase
            .from('r2_teams')
            .select('key, data')
            .eq('key', teamKey)
            .maybeSingle();

          if (r2Row) {
            await supabase
              .from('r2_teams')
              .update({
                data: {
                  ...(r2Row.data || {}),
                  judging: judgingObj
                },
                updated_at: nowIso
              })
              .eq('key', teamKey);
          }
        } catch {
          // ignore if r2_teams not present
        }
      }

      return res.status(200).json({
        ok: true,
        saved: true,
        judging: judgingObj
      });
    } catch (err) {
      console.error('Admin PATCH error:', err.message);
      return res.status(500).json({ error: 'Failed to save judging evaluation.' });
    }
  }

  res.setHeader('Allow', 'GET, POST, PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
}

