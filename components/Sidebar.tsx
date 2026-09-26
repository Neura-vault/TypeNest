"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home", tile: "tile-blue", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" },
  { href: "/practice", label: "Practice", tile: "tile-amber", icon: "M2 6h20v12H2z M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" },
  { href: "/train", label: "Train", tile: "tile-violet", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M9 10h.01M15 10h.01M8 15c1 1.2 2.4 2 4 2s3-.8 4-2" },
  { href: "/academy", label: "Academy", tile: "tile-teal", icon: "M22 10L12 5 2 10l10 5 10-5z M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" },
  { href: "/games", label: "Games", tile: "tile-rose", icon: "M2 7h20v10H2z M6 12h4M8 10v4M15.5 12h.01M18 10.5h.01" },
  { href: "/compete", label: "Compete", tile: "tile-blue", icon: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M6 4h12v6a6 6 0 0 1-12 0V4z M12 16v4M8 20h8" },
  { href: "/stats", label: "Stats", tile: "tile-green", icon: "M3 3v18h18M8 17V9M13 17V5M18 17v-7" },
  { href: "/leaderboard", label: "Leaderboard", tile: "tile-amber", icon: "M4 21V10M12 21V3M20 21v-7", divider: true },
  { href: "/teams", label: "Teams", tile: "tile-rose", icon: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" },
  { href: "/tournaments", label: "Tournaments", tile: "tile-amber", icon: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M6 4h12v6a6 6 0 0 1-12 0V4z M12 16v4M8 20h8" },
  { href: "/missions", label: "Missions", tile: "tile-rose", icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
  { href: "/profile", label: "Profile", tile: "tile-violet", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c1.5-4 5-6 8-6s6.5 2 8 6" },
  { href: "/settings", label: "Settings", tile: "tile-teal", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" }
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      <aside
        className={`w-[264px] shrink-0 flex flex-col p-4 sticky top-0 h-screen overflow-y-auto z-[70] transition-transform
          max-lg:fixed max-lg:left-0 max-lg:shadow-2xl ${open ? "max-lg:translate-x-0" : "max-lg:-translate-x-full"}`}
        style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        <Link href="/" className="block px-2 mb-7 mt-1" onClick={onClose}>
          <Image src="/logo.png" alt="TypeNest" width={140} height={36} priority />
        </Link>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <span key={item.href}>
                {item.divider && (
                  <span className="block h-px my-3 mx-1.5" style={{ background: "var(--border)" }} />
                )}
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 px-2.5 py-2 rounded-2xl text-sm font-semibold transition-all"
                  style={{
                    color: active ? "var(--text)" : "var(--text-dim)",
                    background: active ? "var(--surface-2)" : "transparent",
                    boxShadow: active ? "inset 0 0 0 1px var(--border)" : "none"
                  }}
                >
                  <span
                    className={`icon-tile ${item.tile} ${active ? "solid" : ""}`}
                    style={{ width: 34, height: 34, borderRadius: 10, fontSize: 0 }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-[17px] h-[17px] shrink-0"
                    >
                      <path d={item.icon} />
                    </svg>
                  </span>
                  <span>{item.label}</span>
                  {active && (
                    <span
                      className="ml-auto w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--blue-500)" }}
                    />
                  )}
                </Link>
              </span>
            );
          })}
        </nav>

        <div
          className="mt-3 p-3.5 rounded-2xl text-xs font-medium"
          style={{ background: "var(--hero-grad)", color: "#fff" }}
        >
          <p className="font-bold text-sm mb-1">Keep your streak alive 🔥</p>
          <p className="opacity-90">A few minutes a day builds real speed.</p>
        </div>

        <button
          className="hidden max-lg:flex self-end mt-3 w-9 h-9 rounded-lg items-center justify-center border"
          style={{ borderColor: "var(--border)" }}
          onClick={onClose}
          aria-label="Close menu"
        >
          ✕
        </button>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-[65] lg:hidden"
          style={{ background: "rgba(5,10,20,.5)" }}
          onClick={onClose}
        />
      )}
    </>
  );
}
