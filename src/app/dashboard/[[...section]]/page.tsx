import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { bloodGroups, eligibility, progress } from '@/lib/domain';
import { ActionButton, Field, PortalForm } from '@/components/forms';
import { Badge, date, Empty, PageTitle, Stats } from '@/components/ui';
import { Campaign } from '@prisma/client';
export const metadata = { title: 'Your workspace' };
const bloodOptions = bloodGroups.map((value) => ({ value, label: value }));
export default async function Dashboard({ params }: { params: Promise<{ section?: string[] }> }) {
  const user = await requireUser();
  const section = (await params).section || [];
  const view = section[0] || 'overview';
  const admin = user.role === 'ADMIN';
  const campaignWhere = admin ? {} : { ownerId: user.id };
  if (view === 'profile') {
    const interval = Number(
      (await db.setting.findUnique({ where: { key: 'intervalDays' } }))?.value || 90,
    );
    const check = eligibility(user, new Date(), interval);
    return (
      <>
        <PageTitle
          eyebrow="YOUR DONOR IDENTITY"
          title="A little more about you."
          description="Keep your information current so your care partner can coordinate with you."
        />
        <div className="panel">
          <h2>Profile & screening</h2>
          <p className={`notice ${check.eligible ? 'success' : ''}`}>{check.reason}</p>
          <PortalForm
            endpoint="/api/profile"
            fields={[
              { name: 'name', label: 'Full name', value: user.name },
              { name: 'phone', label: 'Phone number', value: user.phone, type: 'tel' },
              { name: 'city', label: 'City', value: user.city },
              {
                name: 'bloodGroup',
                label: 'Blood group',
                options: bloodOptions,
                value: user.bloodGroup,
              },
              {
                name: 'birthDate',
                label: 'Date of birth',
                type: 'date',
                value: user.birthDate?.toISOString().slice(0, 10),
              },
              {
                name: 'weight',
                label: 'Weight (kg)',
                type: 'number',
                value: user.weight ?? '',
                min: 20,
                max: 300,
              },
              {
                name: 'available',
                label: 'Visible in donor discovery',
                type: 'checkbox',
                value: user.available,
              },
              {
                name: 'avatar',
                label: 'Avatar image URL (HTTPS)',
                value: user.avatar || '',
                type: 'url',
                required: false,
              },
            ]}
          />
        </div>
        <div className="panel">
          <h3>Account privacy</h3>
          <p>
            Deactivation hides your donor profile and ends all sessions. Historical donation records
            are retained for accountability.
          </p>
          <ActionButton
            endpoint="/api/account-delete"
            variant="danger"
            confirm="Deactivate your account? You will be signed out."
          >
            Deactivate my account
          </ActionButton>
        </div>
      </>
    );
  }
  if (view === 'history' || view === 'donations') {
    if (view === 'donations') await requireUser(['PATIENT', 'HOSPITAL', 'BLOOD_BANK', 'ADMIN']);
    const donations = await db.donation.findMany({
      where:
        view === 'history' ? { donorId: user.id } : admin ? {} : { campaign: { ownerId: user.id } },
      include: {
        campaign: true,
        donor: { select: { name: true, bloodGroup: true } },
        feedback: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return (
      <>
        <PageTitle
          eyebrow="EVERY CONTRIBUTION HAS A STORY"
          title={view === 'history' ? 'Your acts of kindness.' : 'Donation tracking.'}
          description="Follow appointments from pledge to confirmed donation."
          action={
            view === 'history' ? (
              <a download className="button outline" href="/api/history?format=csv">
                Export history
              </a>
            ) : undefined
          }
        />
        <div className="panel">
          <h2>{view === 'history' ? 'Donation history' : 'Appointments & donations'}</h2>
          {donations.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Campaign / reference</th>
                    <th>Donor</th>
                    <th>Appointment</th>
                    <th>Units</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {donations.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <Link href={`/campaigns/${d.campaignId}`}>{d.campaign.title}</Link>
                        <small className="block">{d.reference}</small>
                      </td>
                      <td>
                        {d.donor.name}
                        <small className="block">{d.donor.bloodGroup}</small>
                      </td>
                      <td>{date(d.scheduledAt)}</td>
                      <td>{d.units}</td>
                      <td>
                        <Badge status={d.status} />
                      </td>
                      <td>
                        {d.status === 'PENDING' && (
                          <div className="row-actions">
                            {view === 'donations' &&
                              (admin || ['HOSPITAL', 'BLOOD_BANK'].includes(user.role)) && (
                                <>
                                  <ActionButton
                                    endpoint={`/api/donations/${d.id}`}
                                    body={{ status: 'COMPLETED' }}
                                    confirm="Confirm that clinical screening and blood donation have completed?"
                                  >
                                    Confirm
                                  </ActionButton>
                                  <ActionButton
                                    endpoint={`/api/donations/${d.id}`}
                                    body={{ status: 'FAILED' }}
                                    variant="ghost"
                                  >
                                    Failed
                                  </ActionButton>
                                </>
                              )}
                            <ActionButton
                              endpoint={`/api/donations/${d.id}`}
                              body={{ status: 'CANCELLED' }}
                              variant="danger"
                            >
                              Cancel
                            </ActionButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title="Your next chapter is waiting"
              description="Pledged appointments and completed donations will appear here."
            />
          )}
        </div>
        {view === 'history' &&
          donations
            .filter((d) => d.status === 'COMPLETED' && !d.feedback)
            .slice(0, 3)
            .map((d) => (
              <details key={d.id} className="panel">
                <summary>Share your experience: {d.campaign.title}</summary>
                <PortalForm
                  endpoint={`/api/feedback/${d.id}`}
                  button="Submit feedback"
                  fields={[
                    {
                      name: 'rating',
                      label: 'Your rating',
                      options: [5, 4, 3, 2, 1].map((n) => ({
                        value: String(n),
                        label: `${n} stars`,
                      })),
                    },
                    { name: 'comment', label: 'How was your experience?', type: 'textarea' },
                  ]}
                />
              </details>
            ))}
      </>
    );
  }
  if (view === 'campaigns') {
    await requireUser(['PATIENT', 'HOSPITAL', 'BLOOD_BANK', 'ADMIN']);
    if (section[1] === 'new' || section[2] === 'edit') {
      let campaign: Campaign | null = null;
      if (section[2] === 'edit') {
        campaign = await db.campaign.findUnique({ where: { id: section[1] } });
        if (!campaign || (!admin && campaign.ownerId !== user.id)) notFound();
      }
      const categories = await db.category.findMany();
      const fields: Field[] = [
        { name: 'title', label: 'Request title', value: campaign?.title },
        {
          name: 'bloodGroup',
          label: 'Recipient blood group',
          value: campaign?.bloodGroup || user.bloodGroup,
          options: bloodOptions,
        },
        {
          name: 'description',
          label: 'Tell the community what is needed',
          type: 'textarea',
          value: campaign?.description,
        },
        {
          name: 'targetUnits',
          label: 'Required blood units',
          type: 'number',
          min: 1,
          max: 500,
          value: campaign?.targetUnits || 1,
        },
        {
          name: 'categoryId',
          label: 'Category',
          value: campaign?.categoryId,
          options: categories.map((c) => ({ value: c.id, label: c.name })),
        },
        {
          name: 'urgency',
          label: 'Urgency',
          value: campaign?.urgency,
          options: ['STANDARD', 'URGENT', 'EMERGENCY'].map((value) => ({
            value,
            label: value.toLowerCase(),
          })),
        },
        { name: 'city', label: 'City', value: campaign?.city || user.city },
        {
          name: 'hospital',
          label: 'Receiving hospital / blood bank',
          value: campaign?.hospital || user.organization?.name,
        },
        {
          name: 'contact',
          label: 'Appointment contact number',
          type: 'tel',
          value: campaign?.contact || user.phone,
        },
        {
          name: 'endDate',
          label: 'Request closing date',
          type: 'date',
          value: campaign?.endDate.toISOString().slice(0, 10),
        },
      ];
      return (
        <>
          <PageTitle
            eyebrow="GIVE YOUR COMMUNITY A WAY TO HELP"
            title={campaign ? 'Edit your blood request.' : 'Start a blood request.'}
            description="Provide clear details. New requests and edits are reviewed before public discovery."
          />
          <div className="panel">
            <PortalForm
              endpoint={`/api/campaigns${campaign ? `/${campaign.id}` : ''}`}
              fields={fields}
              button={campaign ? 'Save request' : 'Submit for review'}
            />
          </div>
        </>
      );
    }
    const campaigns = await db.campaign.findMany({
      where: campaignWhere,
      include: {
        owner: { select: { name: true } },
        donations: { select: { status: true, units: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return (
      <>
        <PageTitle
          eyebrow="TURN A NEED INTO A CONNECTION"
          title={admin ? 'Campaign management.' : 'Your blood requests.'}
          description="Manage requests, follow progress, and keep donors informed."
          action={
            <Link className="button" href="/dashboard/campaigns/new">
              Create a request
            </Link>
          }
        />
        <div className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Owner</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/campaigns/${c.id}`}>{c.title}</Link>
                      <small className="block">
                        {c.bloodGroup} · {c.city} · closes {date(c.endDate)}
                      </small>
                    </td>
                    <td>{c.owner.name}</td>
                    <td>
                      {progress(c.donations, c.targetUnits).raised}/{c.targetUnits} units
                    </td>
                    <td>
                      <Badge status={c.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        {['PENDING', 'ACTIVE'].includes(c.status) && (
                          <Link
                            className="button small ghost"
                            href={`/dashboard/campaigns/${c.id}/edit`}
                          >
                            Edit
                          </Link>
                        )}
                        {admin && c.status === 'PENDING' && (
                          <>
                            <ActionButton
                              endpoint={`/api/campaign-status/${c.id}`}
                              body={{ status: 'ACTIVE' }}
                            >
                              Approve
                            </ActionButton>
                            <ActionButton
                              endpoint={`/api/campaign-status/${c.id}`}
                              body={{ status: 'REJECTED' }}
                              variant="danger"
                            >
                              Reject
                            </ActionButton>
                          </>
                        )}
                        {['PENDING', 'ACTIVE'].includes(c.status) && (
                          <ActionButton
                            endpoint={`/api/campaign-status/${c.id}`}
                            body={{ status: 'CANCELLED' }}
                            variant="ghost"
                            confirm="Cancel this request and its pending pledges?"
                          >
                            Cancel
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!campaigns.length && (
            <Empty
              title="Your first request starts here"
              description="Create a request to connect with local donors."
            />
          )}
        </div>
        {campaigns
          .filter((c) => c.status === 'ACTIVE')
          .slice(0, 3)
          .map((c) => (
            <details className="panel" key={c.id}>
              <summary>Post a care team update: {c.title}</summary>
              <PortalForm
                endpoint={`/api/updates/${c.id}`}
                button="Publish update"
                fields={[{ name: 'body', label: 'Update for donors', type: 'textarea' }]}
              />
            </details>
          ))}
      </>
    );
  }
  if (view === 'users') {
    await requireUser(['ADMIN']);
    const users = await db.user.findMany({
      include: { organization: true },
      orderBy: [{ approval: 'asc' }, { createdAt: 'desc' }],
    });
    return (
      <>
        <PageTitle
          eyebrow="A TRUSTED COMMUNITY"
          title="People & care partners."
          description="Review institution registrations and manage account access."
        />
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person / partner</th>
                <th>Role</th>
                <th>City</th>
                <th>Approval</th>
                <th>Account</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.name}</b>
                    <small className="block">{u.email}</small>
                    {u.organization && (
                      <small className="block">License: {u.organization.license}</small>
                    )}
                  </td>
                  <td>{u.role.toLowerCase().replace('_', ' ')}</td>
                  <td>{u.city}</td>
                  <td>
                    <Badge status={u.approval} />
                  </td>
                  <td>
                    <Badge status={u.active ? 'ACTIVE' : 'CANCELLED'} />
                  </td>
                  <td>
                    <div className="row-actions">
                      {u.approval === 'PENDING' && (
                        <>
                          <ActionButton
                            endpoint={`/api/users/${u.id}`}
                            body={{ approval: 'APPROVED' }}
                          >
                            Approve
                          </ActionButton>
                          <ActionButton
                            endpoint={`/api/users/${u.id}`}
                            body={{ approval: 'REJECTED' }}
                            variant="danger"
                          >
                            Reject
                          </ActionButton>
                        </>
                      )}
                      {u.id !== user.id && (
                        <ActionButton
                          endpoint={`/api/users/${u.id}`}
                          body={{ active: !u.active }}
                          variant="ghost"
                          confirm={
                            u.active
                              ? 'Disable this account and cancel its open requests and pledges?'
                              : undefined
                          }
                        >
                          {u.active ? 'Disable' : 'Enable'}
                        </ActionButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  }
  if (view === 'inventory') {
    await requireUser(['BLOOD_BANK', 'ADMIN']);
    const inventory = await db.inventory.findMany({
      where: admin ? {} : { organizationId: user.organization?.id || 'none' },
      include: { organization: { select: { name: true } } },
      orderBy: { expiresAt: 'asc' },
    });
    return (
      <>
        <PageTitle
          eyebrow="AVAILABLE WHEN IT MATTERS"
          title="Blood inventory."
          description="Manage batches, expiration dates, and unit issuance."
        />
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Care partner</th>
                <th>Group</th>
                <th>Units</th>
                <th>Expires</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((b) => (
                <tr key={b.id}>
                  <td>{b.batch}</td>
                  <td>{b.organization.name}</td>
                  <td>
                    <span className="blood-tag">{b.bloodGroup}</span>
                  </td>
                  <td>{b.units}</td>
                  <td>
                    {date(b.expiresAt)}
                    {b.expiresAt < new Date() && <Badge status="EXPIRED" />}
                  </td>
                  <td>
                    {!admin && b.units > 0 && b.expiresAt > new Date() && (
                      <ActionButton
                        endpoint={`/api/inventory-use/${b.id}`}
                        body={{ units: 1 }}
                        confirm="Issue one unit from this batch?"
                      >
                        Issue 1 unit
                      </ActionButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!inventory.length && <Empty title="No inventory batches yet" />}
        </div>
        {!admin && (
          <div className="panel">
            <h2>Add an inventory batch</h2>
            <PortalForm
              endpoint="/api/inventory"
              button="Add batch"
              fields={[
                { name: 'batch', label: 'Unique batch reference' },
                { name: 'bloodGroup', label: 'Blood group', options: bloodOptions },
                { name: 'units', label: 'Available units', type: 'number', min: 1, max: 500 },
                { name: 'expiresAt', label: 'Expiry date', type: 'date' },
              ]}
            />
          </div>
        )}
      </>
    );
  }
  if (view === 'settings') {
    await requireUser(['ADMIN']);
    const categories = await db.category.findMany();
    const setting = await db.setting.findUnique({ where: { key: 'intervalDays' } });
    return (
      <>
        <PageTitle
          title="Platform settings."
          description="Manage request categories and donor screening rules."
        />
        <div className="panel">
          <h2>Donor screening interval</h2>
          <PortalForm
            endpoint="/api/settings"
            fields={[
              {
                name: 'intervalDays',
                label: 'Minimum days between donations',
                type: 'number',
                min: 90,
                max: 180,
                value: setting?.value || 90,
              },
            ]}
          />
        </div>
        <div className="panel">
          <h2>Request categories</h2>
          <div className="blood-tags">
            {categories.map((c) => (
              <span className="badge" key={c.id}>
                {c.name}
              </span>
            ))}
          </div>
          <PortalForm
            endpoint="/api/categories"
            fields={[{ name: 'name', label: 'New category name' }]}
            button="Add category"
          />
        </div>
      </>
    );
  }
  if (view === 'feedback') {
    await requireUser(['ADMIN']);
    const feedback = await db.feedback.findMany({
      include: {
        author: { select: { name: true } },
        donation: { include: { campaign: { select: { title: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return (
      <>
        <PageTitle
          title="Community feedback."
          description="Review donation experiences and moderate inappropriate content."
        />
        {feedback.map((f) => (
          <div className="panel" key={f.id}>
            <b>
              {f.author.name} · {f.rating}/5
            </b>
            <p>{f.comment}</p>
            <small>
              {f.donation.campaign.title} · {date(f.createdAt)}
            </small>
            <div>
              <ActionButton
                endpoint={`/api/feedback-delete/${f.id}`}
                variant="danger"
                confirm="Remove this feedback?"
              >
                Remove feedback
              </ActionButton>
            </div>
          </div>
        ))}
        {!feedback.length && (
          <Empty
            title="No feedback submitted yet"
            description="Donors can share an experience after a completed donation."
          />
        )}
      </>
    );
  }
  if (view !== 'overview') notFound();
  const [campaigns, donations, userCount, donorCount, orgCount, audit] = await Promise.all([
    db.campaign.findMany({
      where: campaignWhere,
      include: { donations: { select: { status: true, units: true } } },
    }),
    db.donation.findMany({
      where: admin
        ? {}
        : user.role === 'DONOR'
          ? { donorId: user.id }
          : { campaign: { ownerId: user.id } },
      include: { campaign: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    admin ? db.user.count({ where: { active: true } }) : Promise.resolve(0),
    admin ? db.user.count({ where: { role: 'DONOR', active: true } }) : Promise.resolve(0),
    admin ? db.organization.count() : Promise.resolve(0),
    db.auditLog.findMany({
      where: admin ? {} : { userId: user.id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);
  const completed = donations.filter((d) => d.status === 'COMPLETED');
  const units = completed.reduce((s, d) => s + d.units, 0);
  const stats = admin
    ? [
        {
          label: 'Active accounts',
          value: userCount,
          detail: `${donorCount} donors · ${orgCount} institutions`,
        },
        {
          label: 'Confirmed units',
          value: units,
          detail: `${donations.length} total donation records`,
        },
        {
          label: 'Active campaigns',
          value: campaigns.filter((c) => c.status === 'ACTIVE').length,
          detail: `${campaigns.filter((c) => c.status === 'COMPLETED').length} completed`,
        },
        {
          label: 'Pending requests',
          value: campaigns.filter((c) => c.status === 'PENDING').length,
          detail: 'Awaiting review',
        },
      ]
    : user.role === 'DONOR'
      ? [
          { label: 'Units donated', value: units, detail: 'Confirmed by care partners' },
          {
            label: 'Donation appointments',
            value: donations.length,
            detail: `${donations.filter((d) => d.status === 'PENDING').length} pending`,
          },
          {
            label: 'Requests supported',
            value: new Set(completed.map((d) => d.campaignId)).size,
            detail: 'Your community impact',
          },
          { label: 'Your blood group', value: user.bloodGroup, detail: user.city },
        ]
      : [
          { label: 'Units received', value: units, detail: 'Confirmed blood donations' },
          {
            label: 'Active requests',
            value: campaigns.filter((c) => c.status === 'ACTIVE').length,
          },
          { label: 'Supporting donors', value: new Set(completed.map((d) => d.donorId)).size },
          {
            label: 'Completed requests',
            value: campaigns.filter((c) => c.status === 'COMPLETED').length,
          },
        ];
  return (
    <>
      <PageTitle
        eyebrow={admin ? 'PLATFORM OVERVIEW' : 'YOUR KINDNESS, AT A GLANCE'}
        title={`Hello, ${user.name.split(' ')[0]}.`}
        description={
          admin
            ? 'A clear view of your community, requests, and impact.'
            : 'A stronger community starts with people like you.'
        }
        action={
          <Link
            className="button"
            href={user.role === 'DONOR' ? '/campaigns' : '/dashboard/campaigns/new'}
          >
            {user.role === 'DONOR' ? 'Find a request' : 'Create a request'} →
          </Link>
        }
      />
      <Stats items={stats} />
      <div className="dashboard-grid">
        <div className="panel">
          <div className="section-heading compact">
            <h2>{user.role === 'DONOR' ? 'Your contribution journey' : 'Campaign progress'}</h2>
            <Link
              className="text-link"
              href={user.role === 'DONOR' ? '/dashboard/history' : '/dashboard/campaigns'}
            >
              View all →
            </Link>
          </div>
          {user.role === 'DONOR' ? (
            <div className="bar-chart" aria-label="Completed donations by campaign">
              {Array.from(new Set(completed.map((d) => d.campaignId))).map((id) => {
                const matching = completed.filter((d) => d.campaignId === id);
                return (
                  <div key={id}>
                    <span>{matching[0].campaign.title}</span>
                    <div className="chart-track">
                      <span
                        style={{
                          width: `${Math.max(8, (matching.length / Math.max(1, completed.length)) * 100)}%`,
                        }}
                      />
                    </div>
                    <b>{matching.length} units</b>
                  </div>
                );
              })}
              {!completed.length && <Empty title="Your impact starts with one appointment" />}
            </div>
          ) : (
            <div className="bar-chart">
              {campaigns
                .filter((c) => c.status === 'ACTIVE')
                .slice(0, 5)
                .map((c) => (
                  <div key={c.id}>
                    <span>{c.title}</span>
                    <div className="chart-track">
                      <span style={{ width: `${progress(c.donations, c.targetUnits).percent}%` }} />
                    </div>
                    <b>{progress(c.donations, c.targetUnits).percent}%</b>
                  </div>
                ))}
            </div>
          )}
        </div>
        <div className="panel next-step">
          <span className="eyebrow">YOUR NEXT STEP</span>
          <h2>
            {user.role === 'DONOR'
              ? 'Someone needs a little of you.'
              : admin
                ? 'Keep your community moving.'
                : 'Bring your community together.'}
          </h2>
          <p>
            {user.role === 'DONOR'
              ? 'Discover a compatible request near you and pledge your next appointment.'
              : 'Review activity and keep request details current so donors know how to help.'}
          </p>
          <Link
            className="button cream"
            href={user.role === 'DONOR' ? '/campaigns' : '/dashboard/campaigns'}
          >
            Make a connection →
          </Link>
        </div>
      </div>
      <div className="panel">
        <h2>Recent donations</h2>
        {donations.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {donations.slice(0, 5).map((d) => (
                  <tr key={d.id}>
                    <td>{d.campaign.title}</td>
                    <td>{d.reference}</td>
                    <td>{date(d.createdAt)}</td>
                    <td>
                      <Badge status={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No donation activity yet" />
        )}
      </div>
      <div className="panel">
        <h2>Activity feed</h2>
        {audit.map((a) => (
          <div className="activity" key={a.id}>
            <span className="activity-dot" />
            <div>
              <b>{a.action}</b>
              <p>
                {a.user?.name || 'System'} · {date(a.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
