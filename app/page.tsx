import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="hero">
      <span className="badge">Backend-first lead allocation demo</span>
      <h1>Prowider Mini Lead Distribution System</h1>
      <p>
        A simple Next.js and PostgreSQL implementation for fair lead allocation, database-safe duplicate prevention,
        quota tracking, and live dashboard updates.
      </p>

      <div className="hero-grid">
        <div className="stat-card">
          <strong>Request flow</strong>
          Submit a service enquiry from the public form and persist it as a lead.
        </div>
        <div className="stat-card">
          <strong>Allocation engine</strong>
          Mandatory providers are always included when available, then fair rotation fills the remaining slots.
        </div>
        <div className="stat-card">
          <strong>Live monitoring</strong>
          The dashboard polls the database so new assignments appear without refreshing the page.
        </div>
      </div>

      <div className="actions">
        <Link className="badge" href="/request-service">
          Open request form
        </Link>
        <Link className="badge" href="/dashboard">
          View provider dashboard
        </Link>
        <Link className="badge" href="/test-tools">
          Open test tools
        </Link>
      </div>
    </div>
  );
}
