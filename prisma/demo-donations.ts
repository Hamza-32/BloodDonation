import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';
const names = [
  'Farhan Ahmed',
  'Samira Hossain',
  'Rafiul Islam',
  'Mehedi Hasan',
  'Tahmina Akter',
  'Sami Khan',
  'Nabila Rahman',
  'Imran Chowdhury',
  'Arifa Sultana',
  'Tanvir Mahmud',
  'Jannat Karim',
  'Fahim Rahman',
  'Tasnim Haque',
  'Rashed Ahmed',
  'Sanjida Islam',
  'Adnan Hasan',
];
/** Give each historical fixture a compatible donor and consistent dates. */
export async function normalizeDemoDonations(db: PrismaClient, password: string) {
  const donations = await db.donation.findMany({
    where: { reference: { startsWith: 'DP-SEED-' } },
    include: { campaign: true },
    orderBy: { reference: 'asc' },
  });
  const mainDonor = await db.user.findUniqueOrThrow({ where: { email: 'donor@example.com' } });
  const now = Date.now();
  for (let i = 0; i < donations.length; i++) {
    const d = donations[i];
    const completedAt = new Date(now - (i === 0 ? 100 : 2 + (i % 12)) * 86400000);
    const donor =
      i === 0
        ? mainDonor
        : await db.user.upsert({
            where: { email: `community${i}@example.com` },
            update: {},
            create: {
              name: names[(i - 1) % names.length],
              email: `community${i}@example.com`,
              phone: `01800000${String(i).padStart(3, '0')}`,
              passwordHash: hashPassword(password),
              role: 'DONOR',
              bloodGroup: d.campaign.bloodGroup,
              city: d.campaign.city,
              birthDate: new Date('1994-05-20'),
              weight: 64,
              lastDonation: completedAt,
              available: false,
            },
          });
    await db.donation.update({
      where: { id: d.id },
      data: {
        donorId: donor.id,
        scheduledAt: completedAt,
        completedAt,
        createdAt: new Date(completedAt.getTime() - 86400000),
      },
    });
    await db.user.update({ where: { id: donor.id }, data: { lastDonation: completedAt } });
    await db.campaign.update({
      where: { id: d.campaignId },
      data: {
        startDate: new Date(now - 125 * 86400000),
        createdAt: new Date(now - 126 * 86400000),
      },
    });
  }
}
