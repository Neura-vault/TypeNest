import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono, Noto_Nastaliq_Urdu } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import AppShell from "@/components/AppShell";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "TypeNest — Type Faster, Think Sharper, Build Your Nest",
  description:
    "TypeNest is a complete typing platform — tests, data-driven coaching, games, academy lessons and competition.",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" },
  openGraph: {
    title: "TypeNest — Type Faster, Think Sharper, Build Your Nest",
    description: "Tests, data-driven coaching, games, academy lessons and competition — all in one typing platform.",
    url: siteUrl,
    siteName: "TypeNest",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "TypeNest — Type Faster, Think Sharper, Build Your Nest",
    description: "Tests, data-driven coaching, games, academy lessons and competition — all in one typing platform."
  }
};

// Self-hosted via next/font instead of a blocking <link> to
// fonts.googleapis.com in <head> — removes a render-blocking third-party
// request and the layout shift that came with it (this is also what the
// font-swap fix in TypingEngine was working around; this removes the
// cause instead of just papering over the symptom).
const heading = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-heading" });
const body = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-mono" });
const urdu = Noto_Nastaliq_Urdu({ subsets: ["arabic"], weight: ["500", "700"], variable: "--font-urdu" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // No auth/profile fetch here anymore — that DB round-trip used to run on
  // every single page request (even ones with no user-specific content),
  // forcing the whole app into dynamic rendering. AppShell now fetches the
  // session once, client-side, via /api/me.
  return (
    <html lang="en" className={`${heading.variable} ${body.variable} ${mono.variable} ${urdu.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
        <Analytics />
      </body>
    </html>
  );
}
