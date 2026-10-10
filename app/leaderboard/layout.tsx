import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Global leaderboard",
  description: "See the fastest typists on TypeNest, ranked by speed and accuracy.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
