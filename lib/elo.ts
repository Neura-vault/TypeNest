export interface RankTier {
  name: string;
  min: number;
  color: string;
}

// Thresholds are deliberately simple round numbers — easy to reason about,
// easy to tune later without a migration (this is pure display logic, the
// number that matters is elo_rating itself).
export const RANK_TIERS: RankTier[] = [
  { name: "Bronze", min: 0, color: "#B8733F" },
  { name: "Silver", min: 1000, color: "#9CA3AF" },
  { name: "Gold", min: 1200, color: "#D4A72C" },
  { name: "Platinum", min: 1400, color: "#22B8CF" },
  { name: "Diamond", min: 1600, color: "#6A4BF5" },
  { name: "Master", min: 1800, color: "#E24B9C" },
  { name: "Grandmaster", min: 2000, color: "#E2483D" }
];

export function getRankTier(rating: number): RankTier {
  let tier = RANK_TIERS[0];
  for (const t of RANK_TIERS) {
    if (rating >= t.min) tier = t;
  }
  return tier;
}
