import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';
import { normalizeDemoDonations } from './demo-donations';
const db = new PrismaClient();
const password = process.env.DEMO_PASSWORD;
if (!password || password.length < 12)
  throw new Error('Set DEMO_PASSWORD (12+ characters) in .env before seeding.');
const future = (days: number) => new Date(Date.now() + days * 86400000);
async function main() {
  if (await db.user.count()) {
    console.info('Database already contains users. Seed skipped to preserve data.');
    return;
  }
  const categories = await Promise.all(
    ['Emergency care', 'Surgery', 'Community drive', 'Thalassemia care'].map((name) =>
      db.category.create({ data: { name } }),
    ),
  );
  const users = [
    ['admin', 'Ayesha Rahman', 'ADMIN', 'A+', 'Dhaka'],
    ['donor', 'Hamza Arif', 'DONOR', 'O-', 'Dhaka'],
    ['patient', 'Nusrat Jahan', 'PATIENT', 'B+', 'Dhaka'],
    ['organization', 'Dhaka Community Hospital', 'HOSPITAL', 'AB+', 'Dhaka'],
    ['bloodbank', 'LifeLine Blood Bank', 'BLOOD_BANK', 'O+', 'Chattogram'],
    ['pending', 'Northern Care Hospital', 'HOSPITAL', 'A+', 'Rajshahi'],
    ['sadia', 'Sadia Iffat', 'DONOR', 'B+', 'Dhaka'],
    ['rifah', 'Rifah Zakiah', 'DONOR', 'A+', 'Chattogram'],
    ['tafsir', 'Tafsir Rahman', 'DONOR', 'AB-', 'Sylhet'],
    ['morium', 'Morium Chowdhury', 'DONOR', 'O+', 'Dhaka'],
  ];
  const created = [];
  for (let i = 0; i < users.length; i++) {
    const [handle, name, role, bloodGroup, city] = users[i];
    const institution = ['HOSPITAL', 'BLOOD_BANK'].includes(role);
    created.push(
      await db.user.create({
        data: {
          email: `${handle}@example.com`,
          name,
          role: role as Role,
          bloodGroup,
          city,
          phone: `017000000${String(i).padStart(2, '0')}`,
          passwordHash: hashPassword(password!),
          approval: handle === 'pending' ? 'PENDING' : 'APPROVED',
          birthDate: new Date('1998-04-15'),
          weight: 65,
          ...(institution
            ? {
                organization: {
                  create: {
                    name,
                    license: `DEMO-LIC-${i}`,
                    address: `${city}, Bangladesh`,
                    description:
                      'A community-focused care partner connecting local donors with patients.',
                  },
                },
              }
            : {}),
        },
      }),
    );
  }
  const campaigns = [
    [
      'A little of your time. A lifetime for someone else.',
      'Help patients receiving urgent care at Dhaka Community Hospital. Our care team is coordinating a blood donation drive to keep essential treatment moving. A single appointment can make a meaningful difference.',
      'O+',
      12,
      'URGENT',
      'Dhaka',
      3,
      0,
      'care',
      18,
    ],
    [
      'Give children with thalassemia a brighter tomorrow',
      'Children living with thalassemia rely on regular transfusions. Join our monthly donor program and help families access consistent, dependable support through our registered care partners.',
      'B+',
      16,
      'STANDARD',
      'Dhaka',
      3,
      3,
      'children',
      25,
    ],
    [
      'Stand together for emergency surgery',
      'Our emergency team is preparing for critical surgical care and needs compatible donors. Please pledge an appointment and wait for coordination from the receiving care team before visiting.',
      'A+',
      8,
      'EMERGENCY',
      'Dhaka',
      3,
      1,
      'surgery',
      8,
    ],
    [
      'Chattogram community blood drive',
      'Join a community donation day at LifeLine Blood Bank. Our goal is to replenish blood supplies for local hospitals and improve access to essential care throughout the city.',
      'AB+',
      20,
      'STANDARD',
      'Chattogram',
      4,
      2,
      'community',
      32,
    ],
    [
      'Support recovery, one donation at a time',
      'Patients recovering from complex surgery need sustained support. Our hospital team is organizing appointments with compatible donors to support care over the coming weeks.',
      'O-',
      6,
      'URGENT',
      'Dhaka',
      3,
      1,
      'care',
      15,
    ],
    [
      'An urgent request for a family in Dhaka',
      'A family is seeking compatible donors for a scheduled procedure at Dhaka Community Hospital. The hospital will coordinate clinical screening and confirm all completed appointments.',
      'B-',
      3,
      'EMERGENCY',
      'Dhaka',
      2,
      0,
      'surgery',
      6,
    ],
  ];
  for (let i = 0; i < campaigns.length; i++) {
    const [
      title,
      description,
      bloodGroup,
      targetUnits,
      urgency,
      city,
      ownerIndex,
      catIndex,
      image,
      days,
    ] = campaigns[i];
    const campaign = await db.campaign.create({
      data: {
        title: String(title),
        description: String(description),
        bloodGroup: String(bloodGroup),
        targetUnits: Number(targetUnits),
        urgency: String(urgency),
        city: String(city),
        hospital: 'Dhaka Community Hospital',
        contact: '01700000003',
        ownerId: created[Number(ownerIndex)].id,
        categoryId: categories[Number(catIndex)].id,
        image: String(image),
        endDate: future(Number(days)),
        status: 'ACTIVE',
        updates: {
          create: {
            body: 'Our care team is accepting appointments. Thank you to everyone helping this community.',
          },
        },
      },
    });
    const quantity = [7, 9, 3, 12, 2, 0][i];
    for (let j = 0; j < quantity; j++)
      await db.donation.create({
        data: {
          reference: `DP-SEED-${i}-${j}`,
          donorId: created[[1, 6, 7, 8, 9][j % 5]].id,
          campaignId: campaign.id,
          status: 'COMPLETED',
          scheduledAt: future(-100 - j * 95),
          completedAt: future(-100 - j * 95),
          createdAt: future(-10 - j),
          note: 'Historical demo record',
        },
      });
  }
  await db.campaign.create({
    data: {
      title: 'Northern community donor day',
      description:
        'A new community donor drive is awaiting review by our moderation team before it becomes publicly available.',
      bloodGroup: 'A+',
      targetUnits: 15,
      city: 'Rajshahi',
      hospital: 'Northern Care Hospital',
      contact: '01700000005',
      ownerId: created[5].id,
      categoryId: categories[2].id,
      endDate: future(30),
    },
  });
  const bank = await db.organization.findUniqueOrThrow({ where: { userId: created[4].id } });
  for (const [i, bloodGroup] of ['A+', 'B+', 'O+', 'O-', 'AB+'].entries())
    await db.inventory.create({
      data: {
        organizationId: bank.id,
        bloodGroup,
        units: 6 + i * 2,
        batch: `LL-${2026}-${i + 1}`,
        expiresAt: future(12 + i * 3),
      },
    });
  await normalizeDemoDonations(db, password!);
  await db.setting.create({ data: { key: 'intervalDays', value: '90' } });
  await db.auditLog.create({
    data: { userId: created[0].id, action: 'Demo workspace initialized', entityId: 'seed' },
  });
  console.info(
    'Seed complete: 42 accounts (37 donors), 7 campaigns, 33 historical donations, 5 inventory batches.',
  );
}
main().finally(() => db.$disconnect());
