import { createClient } from "@/lib/supabase/server";
import { LESSONS, LESSON_CHAIN } from "@/lib/academy";
import AcademyClient from "@/components/AcademyClient";

export default async function AcademyPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  let passedIds: string[] = [];
  if (user) {
    const { data } = await supabase
      .from("user_lesson_progress")
      .select("lesson_id, passed")
      .eq("user_id", user.id)
      .eq("passed", true);
    passedIds = (data ?? []).map((r) => r.lesson_id);
  }

  return <AcademyClient lessons={LESSONS} chain={LESSON_CHAIN} passedIds={passedIds} isLoggedIn={!!user} />;
}
