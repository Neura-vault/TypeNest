import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compete",
  description: "Daily challenges, ranked races, tournaments and team battles for typists.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
