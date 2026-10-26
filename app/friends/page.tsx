"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import { bankFor, generateWordList } from "@/lib/wordBank";

interface Friend { friendship_id: string; user_id: string; username: string; avatar_url: string | null; level: number; relation: "friend" | "incoming" | "outgoing" }

const MESSAGES: Record<string, string> = {
  requested: "Friend request sent.",
  accepted: "You are now friends.",
  already_friends: "You are already friends.",
  already_requested: "You already sent a request to this player."
};

export default function FriendsPage() {
  const [list, setList] = useState<Friend[] | null>(null);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [signedOut, setSignedOut] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/friends");
    if (res.status === 401) return setSignedOut(true);
    const data = await res.json();
    setList(data.friends ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function call(method: string, body: unknown) {
    const res = await fetch("/api/friends", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  async function add() {
    if (!name.trim()) return;
    setBusy("add");
    const { ok, data } = await call("POST", { username: name.trim() });
    setMsg(ok ? { text: MESSAGES[data.result] ?? "Done." } : { text: data.error ?? "Could not add.", bad: true });
    if (ok) setName("");
    setBusy(null);
    load();
  }

  async function act(id: string, method: "PATCH" | "DELETE") {
    setBusy(id);
    await call(method, { id });
    setBusy(null);
    load();
  }

  // Creates a 2-player room, puts the invite link on the clipboard, and joins it.
  async function challenge(f: Friend) {
    setBusy(f.friendship_id);
    const res = await fetch("/api/race-rooms/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordList: generateWordList(50, false, false, bankFor("words", "en")), maxPlayers: 2 })
    });
    const data = await res.json();
    if (!res.ok || !data.code) {
      setMsg({ text: data.error ?? "Could not create a race room.", bad: true });
      return setBusy(null);
    }
    const url = `${window.location.origin}/compete/multiplayer/${data.code}`;
    await navigator.clipboard?.writeText(url).catch(() => null);
    window.location.href = `/compete/multiplayer/${data.code}`;
  }

  if (signedOut) {
    return (
      <div className="pd" style={{ maxWidth: 560 }}>
        <h1 className="font-bold">Friends</h1>
        <p className="pd-lab">Sign in to add friends and challenge them to a race.</p>
        <Link href="/login" className="btn-primary tn-btn" style={{ alignSelf: "flex-start" }}>Sign in</Link>
      </div>
    );
  }

  const section = (rel: Friend["relation"]) => (list ?? []).filter((f) => f.relation === rel);
  const row = (f: Friend, actions: React.ReactNode) => (
    <li key={f.friendship_id} className="fr-row">
      <Avatar url={f.avatar_url} name={f.username} size={40} />
      <div className="fr-who">
        <Link href={`/u/${f.username}`}>{f.username}</Link>
        <small>Level {f.level}</small>
      </div>
      <div className="fr-actions">{actions}</div>
    </li>
  );

  const incoming = section("incoming");
  const friends = section("friend");
  const outgoing = section("outgoing");

  return (
    <div>
      <header className="cp-head">
        <h1>Friends</h1>
        <p>Add players by username, then challenge them to a race.</p>
      </header>

      <div className="ms-grid">
        <aside>
          <p className="pf-label">Add a friend</p>
          <div className="fr-add" style={{ marginTop: 12 }}>
            <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Username" maxLength={30} aria-label="Friend's username" />
            <button onClick={add} disabled={busy === "add"} className="btn-primary tn-btn">Add</button>
          </div>
          {msg && <p className="text-sm mt-3" style={{ color: msg.bad ? "var(--red-500)" : "var(--green-500)" }}>{msg.text}</p>}

          {incoming.length > 0 && (
            <>
              <p className="pf-label" style={{ display: "block", marginTop: 32 }}>Requests ({incoming.length})</p>
              <ul className="fr-list">
                {incoming.map((f) =>
                  row(f, (
                    <>
                      <button onClick={() => act(f.friendship_id, "PATCH")} disabled={busy === f.friendship_id} className="btn-primary tn-btn">Accept</button>
                      <button onClick={() => act(f.friendship_id, "DELETE")} disabled={busy === f.friendship_id} className="btn-ghost tn-btn">Decline</button>
                    </>
                  ))
                )}
              </ul>
            </>
          )}
        </aside>

        <section>
          <p className="pf-label">Your friends{list ? ` (${friends.length})` : ""}</p>
          {list === null ? (
            <p className="pd-empty">Loading…</p>
          ) : friends.length === 0 ? (
            <p className="pd-empty">No friends yet. Add someone by username on the left.</p>
          ) : (
            <ul className="fr-list">
              {friends.map((f) =>
                row(f, (
                  <>
                    <button onClick={() => challenge(f)} disabled={busy === f.friendship_id} className="btn-secondary tn-btn">Race</button>
                    <button onClick={() => act(f.friendship_id, "DELETE")} disabled={busy === f.friendship_id} className="btn-ghost tn-btn">Remove</button>
                  </>
                ))
              )}
            </ul>
          )}
          {outgoing.length > 0 && (
            <>
              <p className="pf-label" style={{ display: "block", marginTop: 32 }}>Waiting for a reply</p>
              <ul className="fr-list">
                {outgoing.map((f) =>
                  row(f, <button onClick={() => act(f.friendship_id, "DELETE")} disabled={busy === f.friendship_id} className="btn-ghost tn-btn">Cancel</button>)
                )}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
