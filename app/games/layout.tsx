import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Typing games",
  description: "Practice typing with fast, focused games.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
