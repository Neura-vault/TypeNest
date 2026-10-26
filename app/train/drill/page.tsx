import { createClient } from "@/lib/supabase/server";
import { computeWeakKeys } from "@/lib/weakKeys";
import DrillClient from "@/components/typing/DrillClient";

export default async function DrillPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="text-center py-24">
        <h2 className="text-xl font-bold mb-2">Sign in to drill your weak keys</h2>
        <p style={{ color: "var(--text-dim)" }}>
          This drill is built from your own saved test history — nothing to set up.
        </p>
      </div>
    );
  }

  const { data: charStats } = await supabase
    .from("char_stats")
    .select("char, attempts, errors")
    .eq("user_id", user.id)
    .gte("attempts", 3);

  // Slightly looser than the Train page's headline "weak key" threshold —
  // this just needs enough characters to build a varied word list from.
  const weakKeys = computeWeakKeys(charStats ?? [], 0.08, 10);

  if (weakKeys.length === 0) {
    return (
      <div className="card p-8 text-center max-w-lg mx-auto mt-10" style={{ color: "var(--text-dim)" }}>
        No weak keys identified yet — complete a few more Practice tests first, then come back here.
      </div>
    );
  }

  const { data: reviewRows } = await supabase
    .from("char_review_state")
    .select("char, next_due_at")
    .eq("user_id", user.id)
    .in("char", weakKeys.map((k) => k.char));

  const reviewByChar = new Map((reviewRows ?? []).map((r) => [r.char, r.next_due_at as string]));
  const nowMs = Date.now();

  const dueChars = weakKeys
    .map((k) => k.char)
    .filter((c) => {
      const dueAt = reviewByChar.get(c);
      return !dueAt || new Date(dueAt).getTime() <= nowMs;
    });

  const drillChars = dueChars.length > 0 ? dueChars : weakKeys.map((k) => k.char);

  return <DrillClient chars={drillChars} isReview={dueChars.length > 0} />;
}
