"use client";

import { useState } from "react";
import Avatar from "./Avatar";
import ProfileEditor from "./ProfileEditor";
import type { SocialLinks } from "@/lib/profile";

const SOCIAL_LABELS: Record<string, string> = { twitter: "X", github: "GitHub", instagram: "Instagram", website: "Website" };

export default function ProfileHeader({
  username, uid, avatarUrl, level, xp, bio, country, socialLinks, isOwner, eloRating, rankTierName, rankTierColor
}: {
  username: string;
  uid?: string | null;
  avatarUrl?: string | null;
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
  const into = xp - (level - 1) * 150;
  const pct = Math.max(0, Math.min(100, (into / 150) * 100));

  function copyUid() {
    if (!uid) return;
    navigator.clipboard?.writeText(uid).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <>
      <header className="pd-card ph">
        <div className="ph-ring"><Avatar url={avatarUrl} name={username} size={104} /></div>
        <div className="ph-main">
          <div className="ph-title">
            <h1>{username}</h1>
            {isOwner && (
              <button onClick={() => setEditing(true)} className="ph-pencil" aria-label="Edit profile">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
              </button>
            )}
          </div>
          <p className="ph-sub">Level {level} · {xp} XP{country ? ` · ${country}` : ""}</p>
          <div className="ph-xp">
            <div className="pd-bar"><div style={{ width: `${pct}%`, background: "var(--blue-500)" }} /></div>
            <span>{into} / 150 XP</span>
          </div>
          <div className="ph-chips">
            <span className="pd-chip"><i style={{ background: rankTierColor }} />{rankTierName} · {eloRating}</span>
            {uid && <button onClick={copyUid} className="pd-chip">{copied ? "Copied" : `ID: ${uid}`}</button>}
          </div>
          {bio && <p className="ph-bio">{bio}</p>}
          {links.length > 0 && (
            <p className="ph-links">
              {links.map(([key, value]) => (
                <a key={key} href={value?.startsWith("http") ? value : `https://${value}`} target="_blank" rel="noopener noreferrer">
                  {SOCIAL_LABELS[key] ?? key}
                </a>
              ))}
            </p>
          )}
        </div>
        {isOwner && (
          <button onClick={() => setEditing(true)} className="btn-ghost tn-btn ph-edit">Edit profile</button>
        )}
      </header>

      {editing && (
        <ProfileEditor
          initial={{ username, avatarUrl, bio, country, socialLinks }}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
