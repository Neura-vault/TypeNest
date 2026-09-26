import Link from "next/link";
import WatchDemoButton from "@/components/WatchDemoButton";

const MODES = [
  { title: "Typing Test", desc: "Test your speed and accuracy", href: "/practice", tile: "tile-blue", icon: "M2 6h20v12H2z M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h12" },
  { title: "Typing Games", desc: "Play and have fun", href: "/games", tile: "tile-rose", icon: "M2 7h20v10H2z M6 12h4M8 10v4M15.5 12h.01M18 10.5h.01" },
  { title: "Typing Academy", desc: "Learn, step by step", href: "/academy", tile: "tile-teal", icon: "M22 10L12 5 2 10l10 5 10-5z M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" },
  { title: "Code Typing", desc: "Type real code", href: "/practice?content=code", tile: "tile-violet", icon: "M16 18l6-6-6-6M8 6l-6 6 6 6" }
];

const FEATURES = [
  { title: "AI Coach", desc: "Personalized drills built from your own weak keys and patterns.", tile: "tile-violet", icon: "M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" },
  { title: "Real Progress Tracking", desc: "Typing DNA, consistency scores, and a history that actually means something.", tile: "tile-teal", icon: "M3 3v18h18M8 17V9M13 17V5M18 17v-7" },
  { title: "Compete Live", desc: "Multiplayer races, ranked matches, and global leaderboards.", tile: "tile-amber", icon: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M6 4h12v6a6 6 0 0 1-12 0V4z M12 16v4M8 20h8" }
];

const STATS = [
  { value: "100K+", label: "Active Users" },
  { value: "1M+", label: "Tests Completed" },
  { value: "50+", label: "Countries" },
  { value: "4.8★", label: "User Rating" }
];

export default function HomePage() {
  return (
    <div className="py-10">
      <div className="relative">
        <div className="mesh-glow" />

        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <span
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full mb-5"
              style={{ background: "var(--surface-2)", color: "var(--blue-500)", border: "1px solid var(--border)" }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--amber-500)" }} />
              Free to start — no card needed
            </span>
            <h1 className="text-5xl font-bold leading-[1.08] mb-5 max-w-[11ch]">
              Type Faster,{" "}
              <span
                style={{
                  background: "var(--hero-grad)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text"
                }}
              >
                Think Sharper
              </span>
              , Build Your Nest.
            </h1>
            <p className="text-lg mb-7 max-w-[46ch]" style={{ color: "var(--text-dim)" }}>
              TypeNest is a complete typing platform — tests, data-driven coaching, games, academy lessons and
              competition — built to actually make you faster, not just measure you.
            </p>
            <div className="flex gap-3 flex-wrap mb-7">
              <Link href="/practice" className="btn-primary px-6 py-3.5 rounded-xl font-semibold">
                Start Typing Now
              </Link>
              <WatchDemoButton />
            </div>
            <div className="flex gap-5 flex-wrap text-sm font-medium" style={{ color: "var(--text-dim)" }}>
              <span>✓ Free forever plan</span>
              <span>✓ No account required to try</span>
              <span>✓ Built in the open</span>
            </div>
          </div>

          <div className="card p-6 relative overflow-hidden">
            <div
              className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-70 -z-10"
              style={{ background: "var(--hero-grad)", filter: "blur(46px)" }}
            />
            <div className="relative flex items-center justify-between mb-5">
              <span className="badge">⏱ 30s</span>
              <span className="text-2xl font-heading font-bold" style={{ color: "var(--blue-500)" }}>96 WPM</span>
            </div>
            <div
              className="relative rounded-xl p-4 mb-5 font-heading text-lg leading-relaxed"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
            >
              <span>The quick brown </span>
              <span style={{ color: "var(--blue-500)", borderBottom: "2px solid var(--blue-500)" }}>fox</span>
              <span style={{ color: "var(--text-dim)" }}> jumps over the lazy dog. Typing is a skill that improves with practice.</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: "Accuracy", value: "97.2%", tile: "tile-teal" },
                { label: "Errors", value: "4", tile: "tile-rose" },
                { label: "Consistency", value: "85", tile: "tile-amber" }
              ].map((s) => (
                <div key={s.label} className="rounded-lg p-2.5 text-center" style={{ background: "var(--surface-2)" }}>
                  <div className="font-bold text-sm" style={{ color: `var(--${s.tile.replace("tile-", "")}-500)` }}>
                    {s.value}
                  </div>
                  <div className="text-[11px] font-medium" style={{ color: "var(--text-dim)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Popular Modes</h2>
          <Link href="/practice" className="text-sm font-semibold" style={{ color: "var(--blue-500)" }}>
            Explore All Modes →
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {MODES.map((m) => (
            <Link key={m.title} href={m.href} className="card hover-lift p-5 block">
              <div className={`icon-tile lg ${m.tile} mb-3.5`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                  <path d={m.icon} />
                </svg>
              </div>
              <h3 className="font-semibold mb-1">{m.title}</h3>
              <p className="text-sm" style={{ color: "var(--text-dim)" }}>{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-20 grid md:grid-cols-3 gap-5">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-6">
            <div className={`icon-tile lg solid ${f.tile} mb-4`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
                <path d={f.icon} />
              </svg>
            </div>
            <h3 className="font-semibold text-lg mb-1.5">{f.title}</h3>
            <p className="text-sm" style={{ color: "var(--text-dim)" }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-20 card p-8" style={{ background: "var(--hero-grad)" }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-heading text-3xl font-bold text-white mb-1">{s.value}</div>
              <div className="text-sm font-medium text-white/80">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
