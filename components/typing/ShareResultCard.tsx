"use client";

import { useEffect, useState } from "react";

export default function ShareResultCard({
  wpm,
  accuracy,
  consistency,
  mode,
  amount,
  theme
}: {
  wpm: number;
  accuracy: number;
  consistency: number;
  mode: "time" | "words";
  amount: number;
  theme: string;
}) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    // Checked on mount only (not during render) so the server-rendered
    // markup and the first client render always match — avoids a
    // hydration mismatch from `navigator` not existing on the server.
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    );
  }, []);

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);

    if (username === null) {
      setLoading(true);
      try {
        const res = await fetch("/api/me");
        const data = await res.json();
        setUsername(data?.profile?.username ?? "Guest");
      } catch {
        setUsername("Guest");
      } finally {
        setLoading(false);
      }
    }
  }

  const imageUrl =
    username !== null
      ? `/api/share-card?wpm=${Math.round(wpm)}&acc=${Math.round(accuracy)}&cons=${Math.round(
          consistency
        )}&mode=${mode}&amount=${amount}&theme=${theme}&u=${encodeURIComponent(username)}`
      : null;

  async function handleCopyLink() {
    if (!imageUrl) return;
    const absoluteUrl = `${window.location.origin}${imageUrl}`;
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied or unavailable — the image itself is
      // still visible and downloadable, so this is a soft failure.
    }
  }

  async function handleNativeShare() {
    if (!imageUrl) return;
    const absoluteUrl = `${window.location.origin}${imageUrl}`;
    try {
      await navigator.share({
        title: "My TypeNest result",
        text: `I just typed ${Math.round(wpm)} WPM at ${Math.round(accuracy)}% accuracy on TypeNest!`,
        url: absoluteUrl
      });
    } catch {
      // User dismissed the native share sheet — nothing to do.
    }
  }

  return (
    <div className="mb-6 text-center">
      <button
        onClick={handleToggle}
        className="btn-ghost px-5 py-2.5 rounded-xl font-semibold"
      >
        {open ? "Hide Share Card" : "📤 Share Result"}
      </button>

      {open && (
        <div className="card p-4 mt-4 max-w-md mx-auto text-left">
          {loading || !imageUrl ? (
            <div
              className="rounded-xl animate-pulse"
              style={{ background: "var(--surface-2)", aspectRatio: "1200 / 630" }}
            />
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Your TypeNest result card"
                className="w-full rounded-xl mb-3"
                style={{ border: "1px solid var(--border)" }}
              />
              <div className="flex flex-wrap gap-2 justify-center">
                <a
                  href={imageUrl}
                  download="typenest-result.png"
                  className="btn-secondary px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  Download
                </a>
                <button
                  onClick={handleCopyLink}
                  className="btn-ghost px-4 py-2 rounded-lg text-sm font-semibold"
                >
                  {copied ? "Copied!" : "Copy Link"}
                </button>
                {canNativeShare && (
                  <button
                    onClick={handleNativeShare}
                    className="btn-ghost px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    Share…
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
