import Link from "next/link";
export default function NotFound() {
  return (
    <section className="card placeholder">
      <h1>Page not found</h1>
      <p>This page or resident record does not exist.</p>
      <Link className="record-link" href="/residents">
        Return to residents
      </Link>
    </section>
  );
}
