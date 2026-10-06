import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Calendar, Users, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { db } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { progress } from '@/lib/domain';
import { Badge, CampaignCard, date, TrustNote } from '@/components/ui';
import { PortalForm } from '@/components/forms';
export default async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  const c = await db.campaign.findUnique({
    where: { id },
    include: {
      category: true,
      owner: { include: { organization: true } },
      donations: { select: { status: true, units: true, donorId: true } },
      updates: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (
    !c ||
    (!['ACTIVE', 'COMPLETED'].includes(c.status) &&
      user?.id !== c.ownerId &&
      user?.role !== 'ADMIN')
  )
    notFound();
  const p = progress(c.donations, c.targetUnits);
  const related = await db.campaign.findMany({
    where: { status: 'ACTIVE', id: { not: id } },
    take: 3,
    include: { category: true, donations: { select: { status: true, units: true } } },
  });
  const open = c.status === 'ACTIVE' && c.endDate > new Date();
  return (
    <div className="container section">
      <Link className="breadcrumb" href="/campaigns">
        ← All blood requests
      </Link>
      <div className="detail-grid">
        <article>
          <div className={`detail-art campaign-art ${c.image}`}>
            <Image
              loading="eager"
              width={900}
              height={650}
              unoptimized
              src={`/images/${c.image}.svg`}
              alt="Community care illustration"
            />
            <span className="art-badge">{c.category.name}</span>
            <span className="blood-chip">{c.bloodGroup}</span>
          </div>
          <div className="detail-title">
            <Badge status={c.urgency} />
            <h1>{c.title}</h1>
            <p className="location">
              <MapPin size={16} /> {c.hospital} · {c.city}
            </p>
          </div>
          <div className="panel">
            <h2>About this request</h2>
            <p className="long-copy">{c.description}</p>
            <TrustNote />
          </div>
          <div className="panel">
            <h2>From the care team</h2>
            {c.updates.map((u) => (
              <div className="timeline-item" key={u.id}>
                <small>{date(u.createdAt)}</small>
                <p>{u.body}</p>
              </div>
            ))}
          </div>
          <div className="panel">
            <h2>Your care partner</h2>
            <p>
              <ShieldCheck size={18} /> {c.owner.organization?.name || c.owner.name}
            </p>
            <p className="muted">
              {c.owner.organization?.description ||
                'A community request coordinated with the receiving hospital.'}
            </p>
            <p>Appointment contact: {c.contact}</p>
          </div>
        </article>
        <aside className="donation-sidebar">
          <div className="panel pledge-panel">
            <p className="eyebrow">EVERY UNIT MAKES A DIFFERENCE</p>
            <div className="raised">
              <strong>{p.raised}</strong>
              <span>of {c.targetUnits} units confirmed</span>
            </div>
            <div className="progress">
              <span style={{ width: `${p.percent}%` }} />
            </div>
            <div className="progress-label">
              <b>{p.percent}% fulfilled</b>
              <span>{p.remaining} units still needed</span>
            </div>
            <div className="request-facts">
              <span>
                <Users size={18} />
                {
                  new Set(c.donations.filter((d) => d.status === 'COMPLETED').map((d) => d.donorId))
                    .size
                }{' '}
                supporting donors
              </span>
              <span>
                <Calendar size={18} />
                Closes {date(c.endDate)}
              </span>
              <span>
                <MapPin size={18} />
                {c.city}, Bangladesh
              </span>
            </div>
            <Badge status={c.status} />
            <hr />
            {!open ? (
              <p>This request is closed for new appointments.</p>
            ) : !user ? (
              <>
                <h3>Be someone’s reason for hope.</h3>
                <p className="muted">Sign in to pledge a blood donation appointment.</p>
                <Link className="button full" href="/login">
                  Sign in to help <ArrowUpRight size={17} />
                </Link>
              </>
            ) : user.role !== 'DONOR' ? (
              <p className="notice">
                Donation pledges are available to donor accounts. Your workspace contains request
                management tools.
              </p>
            ) : (
              <>
                <h3>Pledge an appointment</h3>
                <p className="muted">
                  One appointment pledges one unit. The receiving care team confirms completion
                  after screening and donation.
                </p>
                <PortalForm
                  endpoint="/api/donations"
                  button="Confirm my pledge"
                  fields={[
                    { name: 'campaignId', label: '', type: 'hidden', value: id },
                    {
                      name: 'scheduledAt',
                      label: 'Preferred appointment',
                      type: 'datetime-local',
                      min: new Date().toISOString().slice(0, 16),
                      max: c.endDate.toISOString().slice(0, 16),
                    },
                    {
                      name: 'note',
                      label: 'A note for the care team',
                      type: 'textarea',
                      required: false,
                    },
                  ]}
                />
              </>
            )}
            <p className="small-note">
              Local demo: no payment, automated hospital notification, or clinical approval is
              performed.
            </p>
          </div>
        </aside>
      </div>
      <div className="section-heading related">
        <h2>More ways to make a difference.</h2>
      </div>
      <div className="campaign-grid">
        {related.map((r) => (
          <CampaignCard campaign={r} key={r.id} />
        ))}
      </div>
    </div>
  );
}
