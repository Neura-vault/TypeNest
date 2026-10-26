import Link from "next/link";
import HeroTyper from "@/components/HeroTyper";
import WatchDemoButton from "@/components/WatchDemoButton";

const GROUPS = [
  {
    label: "Practise",
    items: [
      { href: "/practice", title: "Typing test", desc: "Timed and word-count tests in English, Urdu and Roman Urdu, with punctuation and numbers on demand." },
      { href: "/practice?content=code", title: "Code typing", desc: "Real code snippets, symbols and all." },
      { href: "/academy", title: "Academy", desc: "Fourteen short lessons, from the home row to symbols and long words." },
      { href: "/train", title: "Coach", desc: "Drills built from your own weak keys, with spaced-repetition review." }
    ]
  },
  {
    label: "Play",
    items: [
      { href: "/games", title: "Arcade", desc: "Falling Words, Speed Rush and Accuracy Survival." },
      { href: "/multiplayer", title: "Live races", desc: "Race friends in real time, rematch, and let others watch." },
      { href: "/friends", title: "Friends", desc: "Add players by username and challenge them to a race." }
    ]
  },
  {
    label: "Compete",
    items: [
      { href: "/compete", title: "Daily challenge", desc: "One counted attempt a day, and a pace bot to chase." },
      { href: "/compete/ranked", title: "Ranked", desc: "An Elo rating that moves with every result." },
      { href: "/teams", title: "Teams", desc: "Join a crew and climb the team board." },
      { href: "/leaderboard", title: "Leaderboards", desc: "Global, monthly, weekly and daily rankings." }
    ]
  }
];

export default function HomePage() {
  return (
    <div className="hm">
      <section className="hm-hero">
        <div className="hm-copy">
          <h1>Get faster at the thing you do all day.</h1>
          <p className="hm-lede">
            Tests, coaching built from your own mistakes, lessons, games and live races. One place, and every number is measured, not made up.
          </p>
          <div className="hm-cta">
            <Link href="/practice" className="btn-primary tn-btn hm-btn">Start a test</Link>
            <WatchDemoButton />
          </div>
          <p className="hm-note">Free to start. No account needed to try.</p>
        </div>
        <HeroTyper />
      </section>

      <section className="hm-map">
        <header>
          <h2>What you can do here</h2>
          <p>Practise, play and compete. Every link below is a working part of the platform.</p>
        </header>
        <div className="hm-cols">
          {GROUPS.map((g) => (
            <div key={g.label} className="hm-col">
              <h3 className="hm-g">{g.label}</h3>
              <ul>
                {g.items.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href}>
                      <span className="hm-t">{it.title}</span>
                      <span className="hm-d">{it.desc}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
