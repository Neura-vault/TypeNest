import Link from "next/link";

export default function NotFound() {
  return (
    <div className="nf">
      <span className="nf-code">Error 404</span>
      <h1>This page does not exist</h1>
      <p>The link may be wrong, or the page has moved. Head back and pick up where you left off.</p>
      <div className="nf-actions">
        <Link href="/" className="btn-primary tn-btn">Go home</Link>
        <Link href="/practice" className="btn-ghost tn-btn">Start typing</Link>
      </div>
    </div>
  );
}
