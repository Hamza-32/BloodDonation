import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, MapPin, Clock3, Droplet, Heart, ShieldCheck } from 'lucide-react';
import { progress } from '@/lib/domain';
import type { Campaign, Category } from '@prisma/client';
export const date = (value: Date) =>
  value.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Dhaka',
  });
export function Badge({ status }: { status: string }) {
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      {status.replaceAll('_', ' ').toLowerCase()}
    </span>
  );
}
export function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Empty({
  title = 'Nothing here yet',
  description = 'Your next step will appear here.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty">
      <Heart size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Stats({
  items,
}: {
  items: { label: string; value: string | number; detail?: string }[];
}) {
  return (
    <div className="stats-grid">
      {items.map((s, i) => (
        <div key={s.label} className="stat-card">
          <span className="stat-icon">{i % 2 ? <Heart size={20} /> : <Droplet size={20} />}</span>
          <p>{s.label}</p>
          <strong>{s.value}</strong>
          {s.detail && <small>{s.detail}</small>}
        </div>
      ))}
    </div>
  );
}
export type CampaignCardData = Campaign & {
  category: Category;
  donations: { status: string; units: number }[];
};
export function CampaignCard({ campaign: c }: { campaign: CampaignCardData }) {
  const p = progress(c.donations, c.targetUnits);
  const days = Math.max(0, Math.ceil((c.endDate.getTime() - new Date().getTime()) / 86400000));
  return (
    <Link className="campaign-card" href={`/campaigns/${c.id}`}>
      <div className={`campaign-art ${c.image}`}>
        <Image
          loading="eager"
          width={900}
          height={650}
          unoptimized
          src={`/images/${c.image}.svg`}
          alt=""
        />
        <span className="art-badge">
          {c.urgency === 'EMERGENCY' ? 'Urgent need' : c.category.name}
        </span>
        <span className="blood-chip">
          {c.bloodGroup}
          <Droplet size={16} />
        </span>
      </div>
      <div className="campaign-body">
        <p className="location">
          <MapPin size={13} /> {c.city}, Bangladesh
        </p>
        <h3>{c.title}</h3>
        <p className="campaign-copy">{c.description}</p>
        <div className="progress">
          <span style={{ width: `${p.percent}%` }} />
        </div>
        <div className="progress-label">
          <span>
            <b>{p.raised}</b> of {c.targetUnits} units donated
          </span>
          <b>{p.percent}%</b>
        </div>
        <div className="card-bottom">
          <span>
            <Clock3 size={14} /> {days} days left
          </span>
          <span className="card-link">
            View request <ArrowUpRight size={17} />
          </span>
        </div>
      </div>
    </Link>
  );
}
export function TrustNote() {
  return (
    <p className="trust-note">
      <ShieldCheck size={17} /> Coordinated with care partners. Every donation requires clinical
      screening.
    </p>
  );
}
