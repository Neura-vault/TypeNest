"use client";

import { useState } from "react";

export default function DeleteAccountCard() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: text })
    });
    if (res.ok) {
      window.location.href = "/";
      return;
    }
    setError((await res.json().catch(() => ({}))).error ?? "Could not delete the account.");
    setBusy(false);
  }

  return (
    <section className="card p-5 mb-5 dz">
      <h3 className="font-semibold mb-1">Delete account</h3>
      <p className="pd-lab">
        Permanently deletes your account, profile photo, results, progress, friends and team membership. This cannot be undone.
      </p>
      <label className="pf-label" style={{ display: "block", margin: "16px 0 6px" }} htmlFor="del-confirm">
        Type DELETE to confirm
      </label>
      <div className="fr-add">
        <input id="del-confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
        <button onClick={remove} disabled={text !== "DELETE" || busy} className="dz-btn">
          {busy ? "Deleting…" : "Delete my account"}
        </button>
      </div>
      {error && <p className="text-sm mt-3" style={{ color: "var(--red-500)" }}>{error}</p>}
    </section>
  );
}
