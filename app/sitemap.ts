import type { MetadataRoute } from "next";
import { createPublicClient } from "@/lib/supabase/public";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Only genuinely public, indexable pages — not the signed-in-only ones
// (profile, stats, missions, train) which show little or nothing useful to
// a logged-out visitor or a search crawler.
const STATIC_ROUTES = ["", "/practice", "/academy", "/games", "/compete", "/leaderboard", "/login", "/signup"];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7
  }));

  // Public profile pages for people who actually show up on the
  // leaderboard — real, indexable content, not an empty shell.
  let profileEntries: MetadataRoute.Sitemap = [];
  try {
    const supabase = createPublicClient();
    const { data } = await supabase.rpc("get_leaderboard_wpm", { limit_count: 200 });
    profileEntries = ((data ?? []) as { username: string }[]).map((row) => ({
      url: `${siteUrl}/u/${row.username}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5
    }));
  } catch {
    // Sitemap generation shouldn't fail the whole page just because the
    // DB call hiccupped — ship what we have (the static routes).
  }

  return [...staticEntries, ...profileEntries];
}
