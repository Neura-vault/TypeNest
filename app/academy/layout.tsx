import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Typing academy",
  description: "Step-by-step typing lessons from the home row to long words and symbols.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
