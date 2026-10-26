import type { Metadata } from "next";
import LegalDoc from "@/components/LegalDoc";
import { PRIVACY } from "@/lib/legal";

export const metadata: Metadata = { title: "Privacy Policy", description: PRIVACY.summary };

export default function Page() {
  return <LegalDoc doc={PRIVACY} />;
}
