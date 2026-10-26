"use client";

import { useCallback, useEffect, useState } from "react";

interface Key { id: string; name: string; prefix: string; created_at: string; last_used_at: string | null }

export default function ApiKeysCard() {
  const [keys, setKeys] = useState<Key[] | null>(null);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/keys");
    if (res.status === 401) return setSignedOut(true);
    setKeys((await res.json()).keys ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setFresh(data.key); setName(""); load(); } else setError(data.error ?? "Could not create the key.");
    setBusy(false);
  }

  async function revoke(id: string) {
    await fetch("/api/keys", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  const when = (d: string | null) => (d ? new Date(d).toLocaleDateString() : "never");

  return (
    <section className="card p-5 mb-5">
      <h3 className="font-semibold mb-1">API keys</h3>
      <p className="pd-lab">
        Read your own profile and results from your own scripts. Keys are read-only and limited to 60 requests a minute.
      </p>

      {signedOut ? (
        <p className="pd-lab" style={{ marginTop: 12 }}>Sign in to create API keys.</p>
      ) : (
        <>
          {fresh && (
            <div className="ak-fresh">
              <p><b>Copy your key now.</b> For security it is shown only once.</p>
              <code>{fresh}</code>
              <div>
                <button className="btn-primary tn-btn" onClick={() => navigator.clipboard?.writeText(fresh).then(() => setCopied(true))}>
                  {copied ? "Copied" : "Copy key"}
                </button>
                <button className="btn-ghost tn-btn" onClick={() => { setFresh(null); setCopied(false); }}>I have saved it</button>
              </div>
            </div>
          )}

          <div className="fr-add" style={{ marginTop: 16 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && name.trim() && create()} placeholder="Key name, for example My script" maxLength={40} aria-label="Key name" />
            <button onClick={create} disabled={busy || !name.trim()} className="btn-primary tn-btn">Create key</button>
          </div>
          {error && <p className="text-sm mt-3" style={{ color: "var(--red-500)" }}>{error}</p>}

          {keys && keys.length > 0 && (
            <ul className="fr-list">
              {keys.map((k) => (
                <li key={k.id} className="fr-row">
                  <div className="fr-who">
                    <b>{k.name}</b>
                    <small><code>{k.prefix}…</code>, created {when(k.created_at)}, last used {when(k.last_used_at)}</small>
                  </div>
                  <button className="btn-ghost tn-btn" onClick={() => revoke(k.id)}>Revoke</button>
                </li>
              ))}
            </ul>
          )}

          <details className="ak-docs">
            <summary>How to use a key</summary>
            <pre>{`curl -H "Authorization: Bearer YOUR_KEY" \\
  https://YOUR-SITE/api/v1/me

curl -H "Authorization: Bearer YOUR_KEY" \\
  "https://YOUR-SITE/api/v1/results?limit=25"`}</pre>
          </details>
        </>
      )}
    </section>
  );
}
