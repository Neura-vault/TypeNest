import type { Metadata } from "next";
import LegalDoc from "@/components/LegalDoc";
import { COOKIES } from "@/lib/legal";

export const metadata: Metadata = { title: "Cookie Policy", description: COOKIES.summary };

export default function Page() {
  return <LegalDoc doc={COOKIES} />;
}
