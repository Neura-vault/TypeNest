import type { Metadata } from "next";
import LegalDoc from "@/components/LegalDoc";
import { ACCEPTABLE_USE } from "@/lib/legal";

export const metadata: Metadata = { title: "Acceptable Use and Fair Play Policy", description: ACCEPTABLE_USE.summary };

export default function Page() {
  return <LegalDoc doc={ACCEPTABLE_USE} />;
}
