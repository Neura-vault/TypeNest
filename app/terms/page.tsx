import type { Metadata } from "next";
import LegalDoc from "@/components/LegalDoc";
import { TERMS } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Service", description: TERMS.summary };

export default function Page() {
  return <LegalDoc doc={TERMS} />;
}
