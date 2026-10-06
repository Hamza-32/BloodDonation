import Image from 'next/image';
import Link from 'next/link';
import { HeartHandshake } from 'lucide-react';
import { PortalForm } from '@/components/forms';
export const metadata = { title: 'Sign in' };
export default function Login() {
  return (
    <div className="container auth-layout">
      <div className="auth-story">
        <span className="step-icon">
          <HeartHandshake size={32} />
        </span>
        <p className="eyebrow">WELCOME BACK TO YOUR COMMUNITY</p>
        <h1>
          Good to see you.
          <br />
          Better together.
        </h1>
        <p>
          Pick up where you left off. Your next act of kindness could be someone’s turning point.
        </p>
        <Image
          loading="eager"
          width={900}
          height={650}
          unoptimized
          src="/images/community.svg"
          alt="Illustration of the donor community"
        />
      </div>
      <div className="auth-panel panel">
        <h2>Welcome back.</h2>
        <p className="muted">Sign in to your Donation Portal account.</p>
        <PortalForm
          endpoint="/api/auth/login"
          button="Sign in"
          fields={[
            { name: 'email', label: 'Email address', type: 'email' },
            { name: 'password', label: 'Password', type: 'password' },
          ]}
        />
        <p className="auth-bottom">
          New here? <Link href="/register">Join the community →</Link>
        </p>
        <div className="notice">
          Reviewing the local demo? Use a seeded account from the README. This environment uses
          demonstration records.
        </div>
      </div>
    </div>
  );
}
