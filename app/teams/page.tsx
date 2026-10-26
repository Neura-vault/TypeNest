import { createClient } from "@/lib/supabase/server";
import TeamJoinCreateForm from "@/components/TeamJoinCreateForm";
import LeaveTeamButton from "@/components/LeaveTeamButton";

interface TeamRow {
  team_id: string;
  name: string;
  code: string;
  emoji: string;
  member_user_id: string;
  member_username: string;
  member_avatar_url: string | null;
  member_role: "owner" | "member";
  member_best_wpm: number | null;
}

export default async function TeamsPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-bold mb-2">Sign in to join or create a team</h2>
        <p style={{ color: "var(--text-dim)" }}>Teams need an account so your typing stats can count toward one.</p>
      </div>
    );
  }

  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const header = (
    <header className="cp-head tm-head">
      <div>
        <h1>Teams</h1>
        <p>Group up with friends, classmates or coworkers and climb the team leaderboard together.</p>
      </div>
      <a href="/teams/leaderboard" className="btn-ghost tn-btn">Team leaderboard</a>
    </header>
  );

  if (!membership?.team_id) {
    return (
      <div className="measure" style={{ maxWidth: 560 }}>
        {header}
        <TeamJoinCreateForm />
      </div>
    );
  }

  const { data: rows } = await supabase.rpc("get_team", { p_team_id: membership.team_id });
  const roster = (rows ?? []) as TeamRow[];

  if (roster.length === 0) {
    return (
      <div className="measure" style={{ maxWidth: 560 }}>
        {header}
        <TeamJoinCreateForm />
      </div>
    );
  }

  const team = roster[0];
  const validWpms = roster.map((r) => r.member_best_wpm).filter((w): w is number => w !== null);
  const avgWpm =
    validWpms.length > 0 ? Math.round((validWpms.reduce((a, b) => a + b, 0) / validWpms.length) * 10) / 10 : null;

  return (
    <div>
      {header}
      <div className="ms-grid">
        <aside className="ms-level">
          <p className="pf-label">Your team</p>
          <div className="tm-emoji" aria-hidden>{team.emoji}</div>
          <h2 className="tm-name">{team.name}</h2>
          <p className="ms-total">Code <b className="tm-code">{team.code}</b>, {roster.length} member{roster.length > 1 ? "s" : ""}</p>
          <div className="tm-avg"><b>{avgWpm ?? "–"}</b><small>Team average WPM</small></div>
        </aside>
        <section>
          <p className="pf-label">Roster</p>
          <ul className="tm-roster">
            {roster.map((m) => (
              <li key={m.member_user_id}>
                <span className="lb-mono">{m.member_username[0]?.toUpperCase()}</span>
                <span className="tm-who">
                  {m.member_username}
                  {m.member_role === "owner" && <span className="badge">Owner</span>}
                  {m.member_user_id === user.id && <small>you</small>}
                </span>
                <span className="tm-wpm">{m.member_best_wpm !== null ? `${m.member_best_wpm} WPM` : "No tests yet"}</span>
              </li>
            ))}
          </ul>
          <div style={{ marginTop: 24 }}><LeaveTeamButton /></div>
        </section>
      </div>
    </div>
  );
}
