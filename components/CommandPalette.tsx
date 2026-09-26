"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const PAGES = [
  { label: "Home", href: "/" },
  { label: "Start Typing Test", href: "/practice" },
  { label: "Adaptive Training & AI Coach", href: "/train" },
  { label: "Typing Academy", href: "/academy" },
  { label: "Typing Arcade (Games)", href: "/games" },
  { label: "Compete (Daily Challenge / Pace Bot Race)", href: "/compete" },
  { label: "Statistics", href: "/stats" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Missions & Achievements", href: "/missions" },
  { label: "Profile", href: "/profile" },
  { label: "Settings", href: "/settings" }
];

interface UserResult {
  username: string;
  uid: string;
  level: number;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [users, setUsers] = useState<UserResult[]>([]);

  const filteredPages = useMemo(
    () => PAGES.filter((p) => p.label.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  // Combined, ordered list: matching pages first, then matching users.
  const results = useMemo(
    () => [
      ...filteredPages.map((p) => ({ type: "page" as const, label: p.label, href: p.href })),
      ...users.map((u) => ({ type: "user" as const, label: `${u.username} (Level ${u.level})`, sub: u.uid, href: `/u/${u.username}` }))
    ],
    [filteredPages, users]
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setUsers([]);
    }
  }, [open]);

  // Debounced user search — only fires for queries 2+ characters, and only
  // hits the network after the person pauses typing for a moment.
  useEffect(() => {
    if (query.trim().length < 2) {
      setUsers([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query.trim())}`);
        const json = await res.json();
        setUsers(json.users ?? []);
      } catch {
        setUsers([]);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  function go(index: number) {
    const item = results[index];
    if (!item) return;
    onClose();
    router.push(item.href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center pt-[12vh] px-5"
      style={{ background: "rgba(5,10,20,.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-[520px] max-w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSelected((s) => Math.min(results.length - 1, s + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setSelected((s) => Math.max(0, s - 1)); }
            else if (e.key === "Enter") { e.preventDefault(); go(selected); }
            else if (e.key === "Escape") onClose();
          }}
          placeholder="Search pages, a username, or a user ID (TN-...)…"
          className="w-full px-4.5 py-4 text-[15px] outline-none border-b bg-transparent"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        />
        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <div className="p-5 text-center text-sm" style={{ color: "var(--text-dim)" }}>No matches</div>
          )}
          {results.map((item, i) => (
            <div
              key={item.href}
              onClick={() => go(i)}
              className="px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer flex items-center gap-2"
              style={{ background: i === selected ? "var(--surface-2)" : "transparent" }}
            >
              {item.type === "user" && <span style={{ color: "var(--blue-500)" }}>@</span>}
              <span className="flex-1">{item.label}</span>
              {item.type === "user" && "sub" in item && item.sub && (
                <span className="text-[11px] font-mono" style={{ color: "var(--text-dim)" }}>{item.sub}</span>
              )}
            </div>
          ))}
        </div>
        <div className="px-3.5 py-2 text-[11px] border-t" style={{ borderColor: "var(--border)", color: "var(--text-dim)" }}>
          ↑↓ to navigate · Enter to select · Esc to close
        </div>
      </div>
    </div>
  );
}
