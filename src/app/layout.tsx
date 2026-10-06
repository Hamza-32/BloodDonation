import type { Metadata } from 'next';
import Link from 'next/link';
import { HeartPulse, ArrowUpRight } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { ActionButton } from '@/components/forms';
import './globals.css';
export const metadata: Metadata = {
  title: {
    default: 'Donation Portal — Give blood. Keep life moving.',
    template: '%s | Donation Portal',
  },
  description:
    'Connect with blood donation requests and community care partners across Bangladesh.',
};
export const dynamic = 'force-dynamic';
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="nav-wrap">
            <Link className="brand" href="/">
              <span className="brand-mark">
                <HeartPulse size={25} />
              </span>
              donation<span className="brand-light">portal</span>
              <span className="brand-dot">.</span>
            </Link>
            <nav aria-label="Main navigation">
              <Link href="/campaigns">Find a request</Link>
              <Link href="/donors">Our donors</Link>
              <Link href="/blood-banks">Care partners</Link>
              <Link href="/compatibility">Blood guide</Link>
            </nav>
            <div className="nav-actions">
              {user ? (
                <>
                  <Link className="button small" href="/dashboard">
                    My workspace <ArrowUpRight size={16} />
                  </Link>
                  <ActionButton endpoint="/api/auth/logout" variant="ghost">
                    Sign out
                  </ActionButton>
                </>
              ) : (
                <>
                  <Link className="sign-in" href="/login">
                    Sign in
                  </Link>
                  <Link className="button small" href="/register">
                    Become a donor <ArrowUpRight size={16} />
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>
        <main>{children}</main>
        <footer>
          <div className="container footer-main">
            <div>
              <Link className="brand" href="/">
                <HeartPulse size={25} /> donationportal.
              </Link>
              <p>
                A stronger community starts
                <br />
                with a little of you.
              </p>
            </div>
            <div>
              <b>Make a difference</b>
              <Link href="/campaigns">Blood requests</Link>
              <Link href="/register">Join our community</Link>
            </div>
            <div>
              <b>Your resources</b>
              <Link href="/compatibility">Blood compatibility</Link>
              <Link href="/blood-banks">Hospitals & blood banks</Link>
            </div>
            <div className="footer-note">
              <span className="live-dot" /> Portfolio demonstration
              <p>
                Seeded records and appointment coordination.
                <br />
                No real payments are processed.
              </p>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>© {new Date().getFullYear()} Donation Portal</span>
            <span>Built around people. Powered by kindness.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
