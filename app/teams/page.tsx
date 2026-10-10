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
    <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
      <div>
        <h1 className="text-2xl font-bold mb-1">Teams</h1>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Group up with friends, classmates or coworkers and climb the team leaderboard together.
        </p>
      </div>
      <a href="/teams/leaderboard" className="btn-ghost px-4 py-2 rounded-xl text-sm font-semibold">
        Team Leaderboard →
      </a>
    </div>
  );

  if (!membership?.team_id) {
    return (
      <div className="py-8 max-w-lg mx-auto">
        {header}
        <TeamJoinCreateForm />
      </div>
    );
  }

  const { data: rows } = await supabase.rpc("get_team", { p_team_id: membership.team_id });
  const roster = (rows ?? []) as TeamRow[];

  if (roster.length === 0) {
    return (
      <div className="py-8 max-w-lg mx-auto">
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
    <div className="py-8 max-w-2xl mx-auto">
      {header}

      <div className="card p-6 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="icon-tile lg tile-rose" style={{ fontSize: 22 }}>
              {team.emoji}
            </div>
            <div>
              <h2 className="text-lg font-bold">{team.name}</h2>
              <p className="text-sm font-mono" style={{ color: "var(--text-dim)" }}>
                Code: {team.code} · {roster.length} member{roster.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold" style={{ color: "var(--blue-500)" }}>
              {avgWpm ?? "—"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>Team Avg WPM</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-5">
          {roster.map((m) => (
            <div key={m.member_user_id} className="flex items-center justify-between text-sm py-1.5">
              <span className="font-medium">
                {m.member_username}
                {m.member_role === "owner" && <span className="badge ml-1.5">Owner</span>}
                {m.member_user_id === user.id && <span style={{ color: "var(--text-dim)" }}> (you)</span>}
              </span>
              <span style={{ color: "var(--text-dim)" }}>
                {m.member_best_wpm !== null ? `${m.member_best_wpm} WPM` : "No tests yet"}
              </span>
            </div>
          ))}
        </div>

        <LeaveTeamButton />
      </div>
    </div>
  );
}
