import { db } from '@/lib/db';
import { bloodGroups, eligibility } from '@/lib/domain';
import { currentUser } from '@/lib/auth';
import { Empty, PageTitle } from '@/components/ui';
import Link from 'next/link';
export const metadata = { title: 'Our donor community' };
export default async function Donors({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  const user = await currentUser();
  const donors = await db.user.findMany({
    where: {
      role: 'DONOR',
      active: true,
      available: true,
      ...(p.blood ? { bloodGroup: p.blood } : {}),
      ...(p.city ? { city: { contains: p.city } } : {}),
    },
    take: 100,
    select: {
      id: true,
      name: true,
      city: true,
      bloodGroup: true,
      birthDate: true,
      weight: true,
      lastDonation: true,
      _count: { select: { donations: { where: { status: 'COMPLETED' } } } },
    },
  });
  const interval = Number(
    (await db.setting.findUnique({ where: { key: 'intervalDays' } }))?.value || 90,
  );
  return (
    <div className="container section">
      <PageTitle
        eyebrow="THE PEOPLE BEHIND THE POSSIBILITY"
        title="Our donor community."
        description="Discover available donors. Appointment coordination happens through blood requests, keeping personal contact information private."
      />
      <form className="filter-bar">
        <input name="city" aria-label="City" placeholder="Search a city…" defaultValue={p.city} />
        <select name="blood" aria-label="Blood group" defaultValue={p.blood}>
          <option value="">All blood groups</option>
          {bloodGroups.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <button className="button">Find donors</button>
        <Link className="text-link" href="/donors">
          Clear
        </Link>
      </form>
      <p className="muted">{donors.length} donors available for discovery</p>
      <div className="donor-grid">
        {donors.map((d) => (
          <div key={d.id} className="panel donor-card">
            <div className="donor-avatar">
              {d.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <span className="blood-tag">{d.bloodGroup}</span>
            <h3>{user ? d.name : `${d.name.split(' ')[0]} ${d.name.split(' ').at(-1)?.[0]}.`}</h3>
            <p className="muted">{d.city}, Bangladesh</p>
            <p>{d._count.donations} completed demo donations</p>
            <span
              className={`badge ${eligibility(d, new Date(), interval).eligible ? 'approved' : 'pending'}`}
            >
              {eligibility(d, new Date(), interval).eligible
                ? 'Screening profile ready'
                : 'Not currently eligible'}
            </span>
            <Link className="text-link" href="/dashboard/campaigns/new">
              Create a blood request →
            </Link>
          </div>
        ))}
      </div>
      {!donors.length && (
        <Empty
          title="No donors match these filters"
          description="Try searching another city or blood group."
        />
      )}
    </div>
  );
}
