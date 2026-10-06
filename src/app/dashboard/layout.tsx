import Image from 'next/image';
import Link from 'next/link';
import {
  LayoutDashboard,
  Heart,
  Users,
  FileText,
  UserRound,
  Package,
  Settings,
  PlusCircle,
  MessageCircle,
} from 'lucide-react';
import { requireUser } from '@/lib/auth';
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const manager = user.role !== 'DONOR';
  const admin = user.role === 'ADMIN';
  const links = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    ...(user.role === 'DONOR'
      ? [{ href: '/dashboard/history', label: 'My donations', icon: Heart }]
      : []),
    ...(manager
      ? [
          {
            href: '/dashboard/campaigns',
            label: admin ? 'All campaigns' : 'My requests',
            icon: FileText,
          },
          { href: '/dashboard/donations', label: 'Donation tracking', icon: Heart },
          { href: '/dashboard/campaigns/new', label: 'Create a request', icon: PlusCircle },
        ]
      : []),
    ...(user.role === 'BLOOD_BANK' || admin
      ? [{ href: '/dashboard/inventory', label: 'Blood inventory', icon: Package }]
      : []),
    ...(admin
      ? [
          { href: '/dashboard/users', label: 'People & partners', icon: Users },
          { href: '/dashboard/feedback', label: 'Feedback', icon: MessageCircle },
          { href: '/dashboard/settings', label: 'Settings', icon: Settings },
        ]
      : []),
    { href: '/dashboard/profile', label: 'My profile', icon: UserRound },
  ];
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <div className="workspace-label">YOUR WORKSPACE</div>
        <div className="workspace-user">
          <span className="donor-avatar">
            {user.avatar ? (
              <Image src={user.avatar} alt="Your avatar" width={40} height={40} unoptimized />
            ) : (
              user.name[0]
            )}
          </span>
          <div>
            <b>{user.name}</b>
            <small>{user.role.replace('_', ' ').toLowerCase()}</small>
          </div>
        </div>
        <nav aria-label="Workspace navigation">
          {links.map((l) => (
            <Link key={l.href} href={l.href}>
              <l.icon size={18} />
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          <Heart size={22} />
          <h4>Small acts add up.</h4>
          <p>Your community is stronger with you in it.</p>
          <Link href="/campaigns">Explore requests →</Link>
        </div>
      </aside>
      <div className="workspace-content">
        {user.approval !== 'APPROVED' && (
          <p className="notice">
            Your institution is {user.approval.toLowerCase()}. An administrator must approve your
            account before request and inventory management are enabled.
          </p>
        )}
        {children}
      </div>
    </div>
  );
}
