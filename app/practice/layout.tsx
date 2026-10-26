import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Typing practice",
  description: "Timed and word-count typing tests in English, Urdu and Roman Urdu.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
