import { getSessionFromRequest, clearSessionCookie, getRuntimeSessionSecret } from '../_lib/session.js';
import {
  getSupabaseAdmin,
  normalizeIndianMobile,
  normalizeTeamName,
  normalizeTeamKey,
  extractSealAnswers,
  extractAnswerMeta,
  buildMembersList
} from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearSessionCookie());
    return res.status(200).json({ authenticated: false, message: 'Session terminated' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = getRuntimeSessionSecret();
  const session = getSessionFromRequest(req, secret);
  if (!session || !session.registrationId) {
    return res.status(200).json({ authenticated: false });
  }

  try {
    const supabase = getSupabaseAdmin();
    const isR2OnlySession = String(session.registrationId).startsWith('r2-');

    if (isR2OnlySession) {
      const teamKey = session.teamKey || normalizeTeamKey(session.teamName || '');
      let r2Record = null;
      try {
        const { data } = await supabase.from('r2_teams').select('*').eq('key', teamKey).maybeSingle();
        r2Record = data;
      } catch {
        // ignore if r2_teams not present
      }
      return res.status(200).json({
        authenticated: true,
        registrationId: session.registrationId,
        teamName: r2Record?.name || session.teamName,
        customTeamName: r2Record?.name || session.teamName,
        teamKey,
        needsTeamName: false,
        leaderName: r2Record?.data?.leader?.name || session.leaderName,
        email: r2Record?.data?.leader?.email || session.email || null,
        teamSize: (r2Record?.data?.members?.length || 0) + 1,
        members: [
          {
            role: 'Team Leader',
            name: r2Record?.data?.leader?.name || session.leaderName,
            email: r2Record?.data?.leader?.email || session.email || null
          }
        ],
        isSubmitted: true,
        hasDraft: false,
        answers: {},
        r2: r2Record?.data || null
      });
    }

    // Query registration & team_answers status using * to avoid missing column errors
    const [regRes, ansRes] = await Promise.all([
      supabase
        .from('registrations')
        .select('*')
        .eq('id', session.registrationId)
        .maybeSingle(),
      supabase
        .from('team_answers')
        .select('status, submitted_at, answers')
        .eq('registration_id', session.registrationId)
        .maybeSingle()
    ]);

    const registration = regRes.data;
    if (!registration) {
      res.setHeader('Set-Cookie', clearSessionCookie());
      return res.status(200).json({ authenticated: false });
    }

    const answerRecord = ansRes.data;
    const isSubmitted = answerRecord?.status === 'submitted';
    const meta = extractAnswerMeta(answerRecord?.answers);
    const { sealAnswers, answeredCount, hasDraft } = extractSealAnswers(answerRecord?.answers);
    const members = buildMembersList(registration);

    const customTeamName = meta.teamName || normalizeTeamName(registration.team_name) || '';
    const displayTeamName = customTeamName || session.teamName || `${registration.full_name}'s Team`;
    const teamKey = customTeamName ? normalizeTeamKey(customTeamName) : (session.teamKey || normalizeTeamKey(displayTeamName));

    return res.status(200).json({
      authenticated: true,
      registrationId: registration.id,
      teamName: displayTeamName,
      customTeamName: customTeamName || null,
      teamKey,
      needsTeamName: !customTeamName && !isSubmitted,
      leaderName: registration.full_name,
      email: registration.email || session.email || null,
      phone: normalizeIndianMobile(registration.phone) || registration.phone || null,
      course: registration.course || null,
      academicYear: registration.academic_year || null,
      teamSize: registration.team_size || members.length,
      members,
      member2Name: registration.member2_name || null,
      isSubmitted,
      submittedAt: answerRecord?.submitted_at || null,
      r1Score: meta.r1Score ?? null,
      answeredCount,
      currentSeal: meta.currentSeal || 1,
      hasDraft: !isSubmitted && hasDraft,
      answers: !isSubmitted ? sealAnswers : {},
      r2: meta.r2 || null
    });
  } catch (err) {
    console.error('Session check error:', err.message);
    return res.status(200).json({
      authenticated: true,
      registrationId: session.registrationId,
      teamName: session.teamName,
      customTeamName: session.teamName,
      teamKey: session.teamKey || normalizeTeamKey(session.teamName),
      needsTeamName: false,
      leaderName: session.leaderName,
      members: [
        {
          role: 'Team Leader',
          name: session.leaderName,
          email: session.email || null
        }
      ],
      isSubmitted: false,
      answers: {}
    });
  }
}
