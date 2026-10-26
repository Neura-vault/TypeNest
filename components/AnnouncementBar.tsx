"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Announcement { id: string; message: string; level: "info" | "warning" }

/** Shows the newest active announcement once per browser session. */
export default function AnnouncementBar() {
  const [item, setItem] = useState<Announcement | null>(null);

  useEffect(() => {
    let dead = false;
    createClient()
      .from("announcements")
      .select("id, message, level")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const a = (data?.[0] ?? null) as Announcement | null;
        if (dead || !a) return;
        try {
          if (window.sessionStorage.getItem(`ann-${a.id}`)) return;
        } catch {
          /* storage unavailable: just show it */
        }
        setItem(a);
      });
    return () => { dead = true; };
  }, []);

  if (!item) return null;
  return (
    <div className="an" data-level={item.level} role="status">
      <p>{item.message}</p>
      <button
        aria-label="Dismiss announcement"
        onClick={() => {
          try { window.sessionStorage.setItem(`ann-${item.id}`, "1"); } catch { /* ignore */ }
          setItem(null);
        }}
      >
        ×
      </button>
    </div>
  );
}
