import {
  getSessionFromRequest,
  createSessionToken,
  serializeSessionCookie,
  getRuntimeSessionSecret
} from '../_lib/session.js';
import {
  getSupabaseAdmin,
  normalizeTeamName,
  normalizeTeamKey,
  extractAnswerMeta,
  buildRound2Roster
} from '../_lib/supabase.js';

const ALLOWED_R2_KEYS = new Set([
  'stage',
  'pending',
  'startedAt',
  'charId',
  'problem',
  'hex',
  'hexAt',
  'unlockAt',
  'twist',
  'twistText',
  'twistExtra',
  'eggs',
  'submissionUrl',
  'repoUrl',
  'zipUrl',
  'zipName',
  'zipSize',
  'zipCloudUrl',
  'submittedAt',
  'leader',
  'members'
]);

let cachedAllR2Snapshot = null;
let cachedAllR2At = 0;
const ALL_R2_CACHE_TTL_MS = 2500;

function sanitizeR2Patch(rawPatch) {
  if (!rawPatch || typeof rawPatch !== 'object' || Array.isArray(rawPatch)) return {};
  const clean = {};
  for (const [k, v] of Object.entries(rawPatch)) {
    if (ALLOWED_R2_KEYS.has(k) && v !== undefined) {
      clean[k] = v;
    }
  }
  return clean;
}

export default async function handler(req, res) {
  const secret = getRuntimeSessionSecret();
  const supabase = getSupabaseAdmin();

  // ===========================================================================
  // GET /api/round2/state
  // ===========================================================================
  if (req.method === 'GET') {
    try {
      const urlObj = new URL(req.url, 'http://localhost');
      const wantAll = urlObj.searchParams.get('all') === '1';

      if (wantAll) {
        const now = Date.now();
        if (cachedAllR2Snapshot && now - cachedAllR2At < ALL_R2_CACHE_TTL_MS) {
          return res.status(200).json(cachedAllR2Snapshot);
        }

        // Return all Round 2 teams merged from team_answers and r2_teams
        const [ansRes, regRes] = await Promise.all([
          supabase.from('team_answers').select('registration_id, status, submitted_at, answers, created_at, updated_at'),
          supabase.from('registrations').select('*')
        ]);

        let r2Rows = [];
        let delayMinutes = null;
        try {
          const [r2TeamsRes, r2CfgRes] = await Promise.all([
            supabase.from('r2_teams').select('key, name, owner, data, created_at, updated_at'),
            supabase.from('r2_config').select('delay_minutes').eq('id', 'event').maybeSingle()
          ]);
          r2Rows = r2TeamsRes.data || [];
          if (r2CfgRes.data?.delay_minutes != null) {
            delayMinutes = Number(r2CfgRes.data.delay_minutes);
          }
        } catch {
          // ignore if r2_teams not created
        }

        const regMap = new Map((regRes.data || []).map(r => [String(r.id), r]));
        const teamsByKey = {};

        for (const r2 of r2Rows) {
          teamsByKey[r2.key] = {
            ...(r2.data || {}),
            key: r2.key,
            name: r2.name,
            uid: r2.owner,
            at: Date.parse(r2.created_at) || Date.now()
          };
        }

        for (const ans of ansRes.data || []) {
          const meta = extractAnswerMeta(ans.answers);
          const reg = regMap.get(String(ans.registration_id));
          const tName = meta.teamName || reg?.team_name;
          if (!tName && !meta.r2) continue;

          const key = meta.teamKey || normalizeTeamKey(tName || `team-${ans.registration_id}`);
          const { leader, members } = buildRound2Roster(reg, meta);
          const existing = teamsByKey[key] || {};

          teamsByKey[key] = {
            ...existing,
            ...(meta.r2 || {}),
            key,
            name: existing.name || tName || `${reg?.full_name || 'Team'}'s Team`,
            leader: existing.leader || leader,
            members: existing.members?.length ? existing.members : members,
            r1Status: ans.status,
            r1Score: meta.r1Score ?? meta.liveScore ?? null,
            at: existing.at || Date.parse(meta.startedAt || ans.created_at) || Date.now()
          };
        }

        const snapshot = {
          teams: teamsByKey,
          config: delayMinutes != null ? { delayMinutes } : {}
        };
        cachedAllR2Snapshot = snapshot;
        cachedAllR2At = Date.now();
        return res.status(200).json(snapshot);
      }

      // Single-team session lookup
      const session = getSessionFromRequest(req, secret);
      const queryTeam = urlObj.searchParams.get('team');

      if ((!session || !session.registrationId) && !queryTeam) {
        return res.status(200).json({ authenticated: false });
      }

      let matchedReg = null;
      let matchedAns = null;
      let r2Record = null;

      if (session?.registrationId && !String(session.registrationId).startsWith('r2-')) {
        const [regRes, ansRes] = await Promise.all([
          supabase.from('registrations').select('*').eq('id', session.registrationId).maybeSingle(),
          supabase.from('team_answers').select('id, status, submitted_at, answers').eq('registration_id', session.registrationId).maybeSingle()
        ]);
        matchedReg = regRes.data;
        matchedAns = ansRes.data;
      }

      const meta = extractAnswerMeta(matchedAns?.answers);
      const resolvedTeamName = normalizeTeamName(
        queryTeam || meta.teamName || matchedReg?.team_name || session?.teamName || ''
      );
      const resolvedTeamKey = normalizeTeamKey(resolvedTeamName);

      if (resolvedTeamKey) {
        try {
          const { data } = await supabase.from('r2_teams').select('*').eq('key', resolvedTeamKey).maybeSingle();
          r2Record = data;
        } catch {
          // ignore if r2_teams not present
        }
      }

      if (!matchedReg && !matchedAns && !r2Record) {
        return res.status(200).json({ authenticated: false });
      }

      const { leader, members } = buildRound2Roster(matchedReg, meta);
      const mergedR2 = {
        ...(r2Record?.data || {}),
        ...(meta.r2 || {})
      };

      const finalTeamName = r2Record?.name || resolvedTeamName || (matchedReg ? `${matchedReg.full_name}'s Team` : 'Team');
      const finalTeamKey = normalizeTeamKey(finalTeamName);

      return res.status(200).json({
        authenticated: true,
        registrationId: matchedReg?.id || session?.registrationId || null,
        teamName: finalTeamName,
        teamKey: finalTeamKey,
        hasCustomTeamName: Boolean(meta.teamName || matchedReg?.team_name || r2Record?.name),
        leader: mergedR2.leader || leader,
        members: mergedR2.members?.length ? mergedR2.members : members,
        r1Submitted: matchedAns?.status === 'submitted',
        r1Score: meta.r1Score ?? null,
        r2: Object.keys(mergedR2).length > 0 ? mergedR2 : null
      });
    } catch (err) {
      console.error('Round 2 state GET error:', err.message);
      return res.status(500).json({ error: 'Failed to retrieve Round 2 state.' });
    }
  }

  // ===========================================================================
  // POST /api/round2/state
  // ===========================================================================
  if (req.method === 'POST') {
    cachedAllR2Snapshot = null;
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch {
          return res.status(400).json({ error: 'Invalid JSON request payload' });
        }
      }

      const action = body?.action || 'save_progress';
      const session = getSessionFromRequest(req, secret);
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();

      // -----------------------------------------------------------------------
      // ACTION: register_or_resume (Sign the Ledger OR Resume by Team Name)
      // -----------------------------------------------------------------------
      if (action === 'register_or_resume') {
        const inputTeamName = normalizeTeamName(body?.teamName || session?.teamName || '');
        const targetKey = normalizeTeamKey(inputTeamName);

        if (!inputTeamName || inputTeamName.length < 2 || !targetKey) {
          return res.status(400).json({ ok: false, error: 'Please enter a valid Team Name (at least 2 characters).' });
        }

        // Look up across team_answers and r2_teams
        const { data: allAnswers } = await supabase
          .from('team_answers')
          .select('id, registration_id, status, submitted_at, answers');

        let matchedAns = (allAnswers || []).find(row => {
          const m = extractAnswerMeta(row.answers);
          const k = m.teamKey || normalizeTeamKey(m.teamName || '');
          return k === targetKey;
        });

        if (!matchedAns && session?.registrationId && !String(session.registrationId).startsWith('r2-')) {
          matchedAns = (allAnswers || []).find(row => String(row.registration_id) === String(session.registrationId)) || null;
        }

        let matchedReg = null;
        const regIdToFetch = matchedAns?.registration_id || (session?.registrationId && !String(session.registrationId).startsWith('r2-') ? session.registrationId : null);
        if (regIdToFetch) {
          const { data: regRow } = await supabase.from('registrations').select('*').eq('id', regIdToFetch).maybeSingle();
          matchedReg = regRow;
        }

        let r2Row = null;
        try {
          const { data } = await supabase.from('r2_teams').select('*').eq('key', targetKey).maybeSingle();
          r2Row = data;
        } catch {
          // ignore if r2_teams not present
        }

        const existingMeta = extractAnswerMeta(matchedAns?.answers);
        const defaultRoster = buildRound2Roster(matchedReg, existingMeta);
        const resolvedLeader = body?.leader || r2Row?.data?.leader || existingMeta.r2?.leader || defaultRoster.leader;
        const resolvedMembers = (Array.isArray(body?.members) && body.members.length > 0)
          ? body.members
          : (r2Row?.data?.members?.length ? r2Row.data.members : defaultRoster.members);

        const mergedR2 = {
          ...(r2Row?.data || {}),
          ...(existingMeta.r2 || {}),
          leader: resolvedLeader,
          members: resolvedMembers,
          stage: existingMeta.r2?.stage || r2Row?.data?.stage || 'soul',
          startedAt: existingMeta.r2?.startedAt || r2Row?.data?.startedAt || nowMs,
          updatedAt: nowMs
        };

        const finalTeamName = existingMeta.teamName || r2Row?.name || inputTeamName;

        // Save in team_answers if we have a matched registration/answer row
        if (matchedAns || matchedReg) {
          const regId = matchedReg?.id || matchedAns?.registration_id;
          const updatedMeta = {
            ...existingMeta,
            registrationId: regId,
            teamName: finalTeamName,
            teamKey: targetKey,
            leaderName: matchedReg?.full_name || resolvedLeader?.name || existingMeta.leaderName,
            leaderEmail: matchedReg?.email || resolvedLeader?.email || existingMeta.leaderEmail,
            leaderPhone: matchedReg?.phone || resolvedLeader?.phone || existingMeta.leaderPhone,
            startedAt: existingMeta.startedAt || nowIso,
            lastActiveAt: nowIso,
            r2: mergedR2
          };

          const updatedAnswers = {
            ...(matchedAns?.answers || {}),
            _meta: updatedMeta
          };

          if (matchedAns) {
            await supabase.from('team_answers').update({ answers: updatedAnswers, updated_at: nowIso }).eq('id', matchedAns.id);
          } else if (regId) {
            await supabase.from('team_answers').insert({
              registration_id: regId,
              status: 'draft',
              answers: updatedAnswers,
              created_at: nowIso,
              updated_at: nowIso
            });
          }
        }

        // Save in r2_teams (best-effort)
        try {
          if (r2Row) {
            await supabase
              .from('r2_teams')
              .update({ name: finalTeamName, data: mergedR2, updated_at: nowIso })
              .eq('key', targetKey);
          } else {
            await supabase
              .from('r2_teams')
              .insert({
                key: targetKey,
                name: finalTeamName,
                owner: matchedReg?.id ? `reg-${matchedReg.id}` : `team-${targetKey}`,
                data: mergedR2,
                created_at: nowIso,
                updated_at: nowIso
              });
          }
        } catch {
          // ignore if r2_teams not present
        }

        // Issue session cookie
        const token = createSessionToken({
          registrationId: matchedReg?.id || matchedAns?.registration_id || `r2-${targetKey}`,
          teamName: finalTeamName,
          teamKey: targetKey,
          leaderName: resolvedLeader?.name || 'Team Leader',
          email: resolvedLeader?.email || ''
        }, secret);
        res.setHeader('Set-Cookie', serializeSessionCookie(token));

        return res.status(200).json({
          ok: true,
          resumed: Boolean(existingMeta.r2?.charId || r2Row?.data?.charId),
          key: targetKey,
          teamName: finalTeamName,
          leader: resolvedLeader,
          members: resolvedMembers,
          r2: mergedR2
        });
      }

      // -----------------------------------------------------------------------
      // ACTION: save_progress (Save Wheel Spins, Eggs, or Project Submission)
      // -----------------------------------------------------------------------
      const patch = sanitizeR2Patch(body?.patch || body);
      const rawKey = body?.teamKey || session?.teamKey || normalizeTeamKey(body?.teamName || session?.teamName || '');
      const teamKey = normalizeTeamKey(rawKey);

      if (!teamKey) {
        return res.status(400).json({ error: 'Valid teamKey or active session is required to save Round 2 progress.' });
      }

      // 1. Find matching team_answers row (by session.registrationId or _meta.teamKey)
      let matchedAns = null;
      if (session?.registrationId && !String(session.registrationId).startsWith('r2-')) {
        const { data } = await supabase
          .from('team_answers')
          .select('id, registration_id, answers')
          .eq('registration_id', session.registrationId)
          .maybeSingle();
        matchedAns = data;
      }

      if (!matchedAns) {
        const { data: allAns } = await supabase
          .from('team_answers')
          .select('id, registration_id, answers');
        matchedAns = (allAns || []).find(row => {
          const m = extractAnswerMeta(row.answers);
          const k = m.teamKey || normalizeTeamKey(m.teamName || '');
          return k === teamKey;
        }) || null;
      }

      let teamName = normalizeTeamName(body?.teamName || session?.teamName || '');
      let mergedR2 = { ...patch, updatedAt: nowMs };

      if (matchedAns) {
        const existingMeta = extractAnswerMeta(matchedAns.answers);
        teamName = existingMeta.teamName || teamName || teamKey;
        mergedR2 = {
          ...(existingMeta.r2 || {}),
          ...patch,
          updatedAt: nowMs
        };

        const updatedAnswers = {
          ...(matchedAns.answers || {}),
          _meta: {
            ...existingMeta,
            teamName,
            teamKey,
            lastActiveAt: nowIso,
            r2: mergedR2
          }
        };

        await supabase
          .from('team_answers')
          .update({ answers: updatedAnswers, updated_at: nowIso })
          .eq('id', matchedAns.id);
      }

      // 2. Sync to public.r2_teams table so realtime / judges board stays updated
      try {
        const { data: existingR2 } = await supabase
          .from('r2_teams')
          .select('key, name, data')
          .eq('key', teamKey)
          .maybeSingle();

        const r2Data = {
          ...(existingR2?.data || {}),
          ...mergedR2,
          updatedAt: nowMs
        };

        if (existingR2) {
          await supabase
            .from('r2_teams')
            .update({
              data: r2Data,
              updated_at: nowIso
            })
            .eq('key', teamKey);
        } else {
          await supabase
            .from('r2_teams')
            .insert({
              key: teamKey,
              name: teamName || teamKey,
              owner: matchedAns?.registration_id ? `reg-${matchedAns.registration_id}` : `team-${teamKey}`,
              data: r2Data,
              created_at: nowIso,
              updated_at: nowIso
            });
        }
      } catch {
        // ignore if r2_teams table does not exist yet
      }

      return res.status(200).json({
        ok: true,
        teamKey,
        r2: mergedR2,
        savedAt: nowIso
      });
    } catch (err) {
      console.error('Round 2 state POST error:', err.message);
      return res.status(500).json({ error: 'Failed to save Round 2 progress.' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

