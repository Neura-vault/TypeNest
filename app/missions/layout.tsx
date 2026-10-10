import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Missions",
  description: "Your TypeNest missions.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
