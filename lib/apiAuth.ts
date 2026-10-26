import { createAdminClient } from "@/lib/supabase/server";
import { hashApiKey, isApiKeyShape } from "@/lib/apiKey";
import { rateLimit } from "@/lib/rateLimit";

type Auth = { userId: string; keyId: string } | { error: string; status: number };

/** Authenticates a public API request that carries "Authorization: Bearer tn_...". */
export async function authenticateApiKey(request: Request): Promise<Auth> {
  const header = request.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!isApiKeyShape(key)) {
    return { error: "Missing or malformed API key. Send the header Authorization: Bearer <key>.", status: 401 };
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("api_keys")
    .select("id, user_id")
    .eq("key_hash", hashApiKey(key))
    .is("revoked_at", null)
    .maybeSingle();
  if (!data) return { error: "Invalid or revoked API key.", status: 401 };

  const limited = await rateLimit(`apikey:${data.id}`, 60, 60_000);
  if (!limited.ok) return { error: "Rate limit exceeded: 60 requests per minute per key.", status: 429 };

  await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return { userId: data.user_id as string, keyId: data.id as string };
}
