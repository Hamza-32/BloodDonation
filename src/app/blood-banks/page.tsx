import { db } from '@/lib/db';
import { PageTitle, date } from '@/components/ui';
export const metadata = { title: 'Care partners' };
export default async function Banks() {
  const partners = await db.organization.findMany({
    where: { user: { approval: 'APPROVED', active: true } },
    include: {
      user: { select: { role: true, city: true } },
      inventory: {
        where: { expiresAt: { gt: new Date() }, units: { gt: 0 } },
        orderBy: { expiresAt: 'asc' },
      },
    },
  });
  return (
    <div className="container section">
      <PageTitle
        eyebrow="CONNECTED THROUGH CARE"
        title="Good hands. Shared purpose."
        description="Explore approved hospitals and blood banks. Inventory reflects local demo records and requires confirmation with the care partner."
      />
      <div className="partner-grid">
        {partners.map((o) => (
          <div key={o.id} className="panel">
            <span className="badge approved">{o.user.role.replace('_', ' ').toLowerCase()}</span>
            <h2>{o.name}</h2>
            <p>{o.description}</p>
            <p className="muted">{o.address}</p>
            {o.inventory.length > 0 && (
              <>
                <h3>Available blood inventory</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Group</th>
                        <th>Units</th>
                        <th>Expires</th>
                      </tr>
                    </thead>
                    <tbody>
                      {o.inventory.map((b) => (
                        <tr key={b.id}>
                          <td>
                            <span className="blood-tag">{b.bloodGroup}</span>
                          </td>
                          <td>{b.units}</td>
                          <td>{date(b.expiresAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
