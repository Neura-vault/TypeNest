"use client";

import { useState } from "react";
import ProfileEditor from "./ProfileEditor";
import type { SocialLinks } from "@/lib/profile";

const SOCIAL_ICONS: Record<string, string> = {
  twitter: "𝕏",
  github: "GH",
  instagram: "IG",
  website: "🔗"
};

export default function ProfileHeader({
  username,
  uid,
  level,
  xp,
  bio,
  country,
  socialLinks,
  isOwner,
  eloRating,
  rankTierName,
  rankTierColor
}: {
  username: string;
  uid?: string | null;
  level: number;
  xp: number;
  bio: string | null;
  country: string | null;
  socialLinks: SocialLinks;
  isOwner: boolean;
  eloRating: number;
  rankTierName: string;
  rankTierColor: string;
}) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const links = Object.entries(socialLinks).filter(([, v]) => v);

  function copyUid() {
    if (!uid) return;
    navigator.clipboard?.writeText(uid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <div className="rounded-2xl p-6 mb-5 text-white relative overflow-hidden" style={{ background: "var(--hero-grad)" }}>
        <div className="absolute -bottom-14 -left-10 w-52 h-52 rounded-full opacity-20 -z-10" style={{ background: "#fff", filter: "blur(46px)" }} />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div className="w-[52px] h-[52px] rounded-2xl bg-white/25 flex items-center justify-center text-xl font-bold shrink-0">
              {username[0]?.toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{username}</h2>
              <span className="text-sm opacity-90">
                Level {level} · {xp} XP{country ? ` · ${country}` : ""}
              </span>
              <span
                className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full align-middle"
                style={{ background: "rgba(255,255,255,0.2)" }}
                title={`${eloRating} rating`}
              >
                <span style={{ color: rankTierColor }}>●</span> {rankTierName} · {eloRating}
              </span>
              {uid && (
                <button
                  onClick={copyUid}
                  title="Copy ID"
                  className="ml-2 text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-white/15 hover:bg-white/25 transition-colors align-middle"
                >
                  {copied ? "Copied!" : `ID: ${uid}`}
                </button>
              )}
            </div>
          </div>
          {isOwner && (
            <button
              onClick={() => setEditing(true)}
              className="text-sm font-semibold px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors shrink-0"
            >
              Edit Profile
            </button>
          )}
        </div>
        {bio && <p className="text-sm opacity-90 mt-4 max-w-xl">{bio}</p>}
        {links.length > 0 && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {links.map(([key, value]) => (
              <a
                key={key}
                href={value?.startsWith("http") ? value : `https://${value}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                {SOCIAL_ICONS[key] ?? key} {value}
              </a>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ProfileEditor
          initial={{ username, bio, country, socialLinks }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
