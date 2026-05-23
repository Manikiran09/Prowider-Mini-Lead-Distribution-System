import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prowider Mini Lead Distribution System',
  description: 'A simple lead distribution system with fair allocation, quota tracking, and live dashboard updates.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <header className="topbar">
            <Link href="/" className="brand">
              Prowider Mini Lead Distribution System
            </Link>
            <nav className="nav">
              <Link href="/request-service">Request Service</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/test-tools">Test Tools</Link>
            </nav>
          </header>
          <main className="main">{children}</main>
        </div>
      </body>
    </html>
  );
}
