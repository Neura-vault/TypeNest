"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import AvatarCropper from "./AvatarCropper";
import { createClient } from "@/lib/supabase/client";
import { COUNTRIES, SOCIAL_LINK_KEYS, type SocialLinks } from "@/lib/profile";

interface ProfileEditorProps {
  initial: {
    username: string;
    avatarUrl?: string | null;
    bio: string | null;
    country: string | null;
    socialLinks: SocialLinks;
  };
  onClose: () => void;
}

const SOCIAL_LABELS: Record<string, string> = {
  twitter: "Twitter / X",
  github: "GitHub",
  instagram: "Instagram",
  website: "Website"
};

export default function ProfileEditor({ initial, onClose }: ProfileEditorProps) {
  const router = useRouter();
  const [username, setUsername] = useState(initial.username);
  const [bio, setBio] = useState(initial.bio ?? "");
  const [country, setCountry] = useState(initial.country ?? "");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(initial.socialLinks);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initial.avatarUrl ?? null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return setError("Please choose an image file.");
    if (f.size > 15 * 1024 * 1024) return setError("That image is too large. Choose one under 15 MB.");
    setError(null);
    setCropFile(f);
  }

  async function patchAvatar(url: string | null) {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarUrl: url })
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Could not save photo.");
  }

  async function uploadCropped(blob: Blob) {
    setCropFile(null);
    setPhotoBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required.");
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (upErr) throw new Error(upErr.message);
      const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
      await patchAvatar(url);
      const old = avatarUrl?.split("/avatars/")[1];
      setAvatarUrl(url);
      if (old) void supabase.storage.from("avatars").remove([old]);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    }
    setPhotoBusy(false);
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setError(null);
    try {
      await patchAvatar(null);
      const old = avatarUrl?.split("/avatars/")[1];
      if (old) void createClient().storage.from("avatars").remove([old]);
      setAvatarUrl(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove photo.");
    }
    setPhotoBusy(false);
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, bio, country, socialLinks })
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Something went wrong.");
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center px-5" style={{ background: "rgba(5,10,20,.5)" }}>
      <div className="pd-card p-6 w-full max-w-md max-h-[88vh] overflow-y-auto">
        <h3 className="font-bold text-lg mb-5">Edit profile</h3>

        <div className="flex items-center gap-4 mb-6">
          <Avatar url={avatarUrl} name={username || "?"} size={72} />
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
            <button onClick={() => fileRef.current?.click()} disabled={photoBusy} className="btn-ghost px-4 py-2 rounded-lg text-sm font-semibold">
              {photoBusy ? "Saving photo…" : avatarUrl ? "Change photo" : "Upload photo"}
            </button>
            {avatarUrl && !photoBusy && (
              <button onClick={removePhoto} className="text-xs font-semibold text-left" style={{ color: "var(--text-dim)" }}>
                Remove photo
              </button>
            )}
          </div>
        </div>

        <label className="text-sm font-semibold block mb-1.5">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={20}
          className="w-full px-3.5 py-2.5 rounded-xl border text-sm mb-4"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        />

        <label className="text-sm font-semibold block mb-1.5">Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="Tell people a little about your typing journey…"
          className="w-full px-3.5 py-2.5 rounded-xl border text-sm mb-1 resize-none"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        />
        <p className="text-xs mb-4 text-right" style={{ color: "var(--text-dim)" }}>{bio.length}/200</p>

        <label className="text-sm font-semibold block mb-1.5">Country</label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border text-sm mb-4"
          style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
        >
          <option value="">Prefer not to say</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label className="text-sm font-semibold block mb-1.5">Social links</label>
        <div className="flex flex-col gap-2 mb-5">
          {SOCIAL_LINK_KEYS.map((key) => (
            <input
              key={key}
              value={socialLinks[key] ?? ""}
              onChange={(e) => setSocialLinks((s) => ({ ...s, [key]: e.target.value }))}
              placeholder={SOCIAL_LABELS[key]}
              className="w-full px-3.5 py-2 rounded-xl border text-sm"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            />
          ))}
        </div>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <div className="flex gap-2.5">
          <button onClick={onClose} className="btn-ghost flex-1 py-2.5 rounded-xl font-semibold text-sm">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2.5 rounded-xl font-semibold text-sm">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
      {cropFile && <AvatarCropper file={cropFile} onCancel={() => setCropFile(null)} onDone={uploadCropped} />}
    </div>
  );
}
