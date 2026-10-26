import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Your TypeNest profile.",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
