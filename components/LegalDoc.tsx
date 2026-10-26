import Link from "next/link";
import { LEGAL_LINKS, type LegalDocument } from "@/lib/legal";

export default function LegalDoc({ doc }: { doc: LegalDocument }) {
  return (
    <div className="lg">
      <header className="lg-head">
        <p className="pf-label">Legal</p>
        <h1>{doc.title}</h1>
        <p>{doc.summary}</p>
        <p className="lg-date">Last updated {doc.updated}</p>
      </header>

      <div className="lg-grid">
        <aside className="lg-toc" aria-label="On this page">
          <p className="pf-label">On this page</p>
          <ol>
            {doc.sections.map((s, i) => (
              <li key={s.title}><a href={`#s${i + 1}`}>{s.title}</a></li>
            ))}
          </ol>
          <p className="pf-label lg-other">Other documents</p>
          <ul>
            {LEGAL_LINKS.filter((l) => l.href !== `/${doc.slug}`).map((l) => (
              <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
            ))}
          </ul>
        </aside>

        <article className="lg-body">
          {doc.sections.map((s, i) => (
            <section key={s.title} id={`s${i + 1}`}>
              <h2><span>{String(i + 1).padStart(2, "0")}</span>{s.title}</h2>
              {s.paras?.map((p, k) => <p key={k}>{p}</p>)}
              {s.list && <ul>{s.list.map((li, k) => <li key={k}>{li}</li>)}</ul>}
              {s.after?.map((p, k) => <p key={`a${k}`}>{p}</p>)}
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
