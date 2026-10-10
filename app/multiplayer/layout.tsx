import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Multiplayer typing races",
  description: "Race friends in real time, join tournaments and climb the race leaderboard.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
