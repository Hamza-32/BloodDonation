import { db } from '@/lib/db';
import { bloodGroups } from '@/lib/domain';
import { CampaignCard, Empty, PageTitle } from '@/components/ui';
import Link from 'next/link';
export const metadata = { title: 'Find a blood request' };
export default async function Campaigns({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const sort =
    params.sort === 'closing' ? { endDate: 'asc' as const } : { createdAt: 'desc' as const };
  const where = {
    status: params.status === 'COMPLETED' ? ('COMPLETED' as const) : ('ACTIVE' as const),
    ...(params.q
      ? {
          OR: [
            { title: { contains: params.q } },
            { city: { contains: params.q } },
            { hospital: { contains: params.q } },
          ],
        }
      : {}),
    ...(params.blood ? { bloodGroup: params.blood } : {}),
    ...(params.category ? { categoryId: params.category } : {}),
    ...(params.urgency ? { urgency: params.urgency } : {}),
  };
  const [campaigns, count, categories] = await Promise.all([
    db.campaign.findMany({
      where,
      include: { category: true, donations: { select: { status: true, units: true } } },
      orderBy: sort,
      take: 9,
      skip: (page - 1) * 9,
    }),
    db.campaign.count({ where }),
    db.category.findMany(),
  ]);
  return (
    <div className="container section">
      <PageTitle
        eyebrow="YOUR COMMUNITY NEEDS YOU"
        title="Find your next act of kindness."
        description="Browse requests, meet a need, and help keep life moving."
        action={
          <Link className="button outline" href="/dashboard/campaigns/new">
            Create a request
          </Link>
        }
      />
      <form className="filter-bar">
        <input
          aria-label="Search requests"
          name="q"
          placeholder="Search by cause, hospital, or city…"
          defaultValue={params.q}
        />
        <select aria-label="Blood group" name="blood" defaultValue={params.blood}>
          <option value="">All blood groups</option>
          {bloodGroups.map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
        <select aria-label="Category" name="category" defaultValue={params.category}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select aria-label="Urgency" name="urgency" defaultValue={params.urgency}>
          <option value="">Any urgency</option>
          <option value="EMERGENCY">Emergency</option>
          <option value="URGENT">Urgent</option>
          <option value="STANDARD">Standard</option>
        </select>
        <select aria-label="Status" name="status" defaultValue={params.status}>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <select aria-label="Sort" name="sort" defaultValue={params.sort}>
          <option value="newest">Newest first</option>
          <option value="closing">Closing soon</option>
        </select>
        <button className="button small">Find requests</button>
      </form>
      <div className="results-label">
        <b>{count} requests</b>
        <Link href="/campaigns">Clear filters</Link>
      </div>
      {campaigns.length ? (
        <div className="campaign-grid">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      ) : (
        <Empty
          title="No requests match your search"
          description="Try another blood group or remove a filter."
        />
      )}
      <div className="pagination">
        {Array.from({ length: Math.ceil(count / 9) }, (_, i) => {
          const q = new URLSearchParams(
            Object.entries(params).filter((v): v is [string, string] => v[1] !== undefined),
          );
          q.set('page', String(i + 1));
          return (
            <Link
              key={i}
              className={`button small ${page === i + 1 ? '' : 'outline'}`}
              href={`/campaigns?${q}`}
            >
              {i + 1}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
