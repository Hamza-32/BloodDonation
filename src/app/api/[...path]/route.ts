import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { Prisma, Role, CampaignStatus, Approval } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { createSession, currentUser, hashPassword, tokenHash, verifyPassword } from '@/lib/auth';
import { campaignSchema, phone, registrationSchema } from '@/lib/validation';
import { bloodGroups } from '@/lib/domain';
import { ApiError } from '@/lib/errors';
import { pledgeDonation, transitionDonation } from '@/services/donations';

type Context = { params: Promise<{ path: string[] }> };
const audit = (userId: string, action: string, entityId: string) =>
  db.auditLog.create({ data: { userId, action, entityId } });
async function limit(key: string, max: number, minutes: number) {
  const now = new Date();
  const count = await db.$transaction(async (tx) => {
    const existing = await tx.rateLimit.findUnique({ where: { key } });
    if (!existing || existing.resetAt <= now) {
      await tx.rateLimit.upsert({
        where: { key },
        create: { key, resetAt: new Date(Date.now() + minutes * 60000) },
        update: { count: 1, resetAt: new Date(Date.now() + minutes * 60000) },
      });
      return 1;
    }
    return (await tx.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } })).count;
  });
  if (count > max) throw new ApiError('Too many attempts. Please try again later.', 429);
}
async function handle(req: NextRequest, ctx: Context) {
  const path = (await ctx.params).path;
  const resource = path[0],
    id = path[1];
  const user = await currentUser();
  const requireRole = (roles?: Role[]) => {
    if (!user) throw new ApiError('Please sign in to continue.', 401);
    if (roles && !roles.includes(user.role)) throw new ApiError('Access denied.', 403);
    return user;
  };
  if (req.method === 'GET') {
    if (resource === 'campaigns') {
      const campaigns = await db.campaign.findMany({
        where: { status: { in: ['ACTIVE', 'COMPLETED'] } },
        include: {
          category: true,
          donations: { select: { status: true, units: true } },
          owner: { select: { name: true } },
        },
      });
      const selected = id ? campaigns.find((c) => c.id === id) : campaigns;
      if (!selected) throw new ApiError('Campaign not found.', 404);
      return NextResponse.json(selected);
    }
    if (resource === 'history') {
      const actor = requireRole();
      const donations = await db.donation.findMany({
        where: { donorId: actor.id },
        include: { campaign: { select: { title: true, hospital: true } } },
        orderBy: { createdAt: 'desc' },
      });
      if (req.nextUrl.searchParams.get('format') === 'csv') {
        const cell = (s: string) => `"${s.replace(/"/g, '""').replace(/^[=+@-]/, "'")}"`;
        return new NextResponse(
          [
            'Reference,Campaign,Units,Status,Date',
            ...donations.map((d) =>
              [d.reference, d.campaign.title, String(d.units), d.status, d.createdAt.toISOString()]
                .map(cell)
                .join(','),
            ),
          ].join('\r\n'),
          {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': 'attachment; filename="donation-history.csv"',
            },
          },
        );
      }
      return NextResponse.json(donations);
    }
    throw new ApiError('Resource not found.', 404);
  }
  if (req.headers.get('origin') !== (process.env.APP_URL || 'http://127.0.0.1:3000'))
    throw new ApiError('Request origin is not allowed.', 403);
  const body: unknown = await req.json().catch(() => {
    throw new ApiError('Invalid request body.');
  });
  if (resource === 'auth' && id === 'register') {
    const data = registrationSchema.parse(body);
    await limit(`register:${req.headers.get('x-forwarded-for') || 'local'}`, 10, 60);
    const organization = ['HOSPITAL', 'BLOOD_BANK'].includes(data.role);
    const created = await db.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        passwordHash: hashPassword(data.password),
        role: data.role,
        city: data.city,
        bloodGroup: data.bloodGroup,
        approval: organization ? 'PENDING' : 'APPROVED',
        ...(organization
          ? {
              organization: {
                create: {
                  name: data.name,
                  license: data.license!,
                  address: data.address!,
                  description: 'Organization awaiting verification.',
                },
              },
            }
          : {}),
      },
    });
    await createSession(created.id);
    await audit(created.id, 'Account registered', created.id);
    return NextResponse.json(
      {
        message: organization
          ? 'Account created. Organization approval is pending.'
          : 'Welcome to Donation Portal.',
        redirect: '/dashboard',
      },
      { status: 201 },
    );
  }
  if (resource === 'auth' && id === 'login') {
    const data = z
      .object({ email: z.email().toLowerCase(), password: z.string().min(1).max(128) })
      .parse(body);
    await limit(`login:${data.email}`, 10, 15);
    const found = await db.user.findUnique({ where: { email: data.email } });
    const valid = verifyPassword(
      data.password,
      found?.passwordHash ?? hashPassword('InvalidCredential!000'),
    );
    if (!found || !valid || !found.active)
      throw new ApiError('Email or password is incorrect.', 401);
    await createSession(found.id);
    return NextResponse.json({ message: 'Welcome back.', redirect: '/dashboard' });
  }
  if (resource === 'auth' && id === 'logout') {
    const token = (await cookies()).get('portal_session')?.value;
    if (token) await db.session.deleteMany({ where: { tokenHash: tokenHash(token) } });
    (await cookies()).delete('portal_session');
    return NextResponse.json({ redirect: '/', message: 'You have signed out.' });
  }
  const actor = requireRole();
  if (resource === 'profile') {
    const data = z
      .object({
        name: z.string().trim().min(2).max(80),
        phone,
        city: z.string().trim().min(2).max(80),
        bloodGroup: z.enum(bloodGroups),
        birthDate: z.coerce.date().max(new Date()),
        weight: z.coerce.number().min(20).max(300),
        available: z.boolean(),
        avatar: z
          .union([
            z.literal(''),
            z.url().refine((v) => v.startsWith('https://'), 'Use an HTTPS image URL.'),
          ])
          .optional(),
      })
      .parse(body);
    await db.user.update({
      where: { id: actor.id },
      data: { ...data, avatar: data.avatar || null },
    });
    await audit(actor.id, 'Profile updated', actor.id);
    return NextResponse.json({ message: 'Your profile has been updated.' });
  }
  if (resource === 'campaigns') {
    requireRole(['PATIENT', 'HOSPITAL', 'BLOOD_BANK', 'ADMIN']);
    if (actor.approval !== 'APPROVED')
      throw new ApiError('Your organization must be approved first.', 403);
    const data = campaignSchema.parse(body);
    if (!(await db.category.findUnique({ where: { id: data.categoryId } })))
      throw new ApiError('Choose an existing category.');
    if (id) {
      const existing = await db.campaign.findUnique({
        where: { id },
        include: { donations: true },
      });
      if (!existing) throw new ApiError('Campaign not found.', 404);
      if (existing.ownerId !== actor.id && actor.role !== 'ADMIN')
        throw new ApiError('Access denied.', 403);
      if (!['ACTIVE', 'PENDING'].includes(existing.status))
        throw new ApiError('Closed campaigns cannot be edited.');
      const confirmed = existing.donations
        .filter((d) => d.status === 'COMPLETED')
        .reduce((s, d) => s + d.units, 0);
      if (data.targetUnits < confirmed)
        throw new ApiError('Target cannot be below confirmed donations.');
      if (existing.donations.length && data.bloodGroup !== existing.bloodGroup)
        throw new ApiError('Blood group cannot change after a pledge.');
      await db.campaign.update({
        where: { id },
        data: { ...data, status: actor.role === 'ADMIN' ? existing.status : 'PENDING' },
      });
      await audit(actor.id, 'Campaign edited', id);
      return NextResponse.json({
        message: 'Campaign saved and submitted for review.',
        redirect: '/dashboard/campaigns',
      });
    }
    await limit(`campaign:${actor.id}`, 5, 60);
    if (
      data.urgency === 'EMERGENCY' &&
      (await db.campaign.count({
        where: { ownerId: actor.id, urgency: 'EMERGENCY', status: { in: ['PENDING', 'ACTIVE'] } },
      }))
    )
      throw new ApiError('You already have an open emergency request.');
    const campaign = await db.campaign.create({
      data: { ...data, ownerId: actor.id, status: actor.role === 'ADMIN' ? 'ACTIVE' : 'PENDING' },
    });
    await audit(actor.id, 'Campaign submitted', campaign.id);
    return NextResponse.json(
      {
        message: 'Your request has been submitted for approval.',
        redirect: '/dashboard/campaigns',
      },
      { status: 201 },
    );
  }
  if (resource === 'donations' && !id) {
    requireRole(['DONOR']);
    const data = z
      .object({
        campaignId: z.string(),
        scheduledAt: z.coerce.date(),
        note: z.string().max(500).default(''),
      })
      .parse(body);
    await limit(`pledge:${actor.id}`, 8, 60);
    const donation = await pledgeDonation(actor, data);
    return NextResponse.json(
      {
        message: `Appointment pledged. Reference: ${donation.reference}`,
        redirect: '/dashboard/history',
      },
      { status: 201 },
    );
  }
  if (resource === 'donations' && id) {
    const data = z.object({ status: z.enum(['COMPLETED', 'FAILED', 'CANCELLED']) }).parse(body);
    await transitionDonation(actor, id, data.status);
    return NextResponse.json({ message: 'Donation status updated.' });
  }
  if (resource === 'campaign-status' && id) {
    const data = z.object({ status: z.enum(['ACTIVE', 'REJECTED', 'CANCELLED']) }).parse(body);
    const campaign = await db.campaign.findUnique({
      where: { id },
      include: { owner: { select: { active: true, approval: true } } },
    });
    if (!campaign) throw new ApiError('Campaign not found.', 404);
    if (actor.role !== 'ADMIN' && !(actor.id === campaign.ownerId && data.status === 'CANCELLED'))
      throw new ApiError('Access denied.', 403);
    if (['COMPLETED', 'CANCELLED'].includes(campaign.status))
      throw new ApiError('This campaign is already closed.');
    if (data.status === 'ACTIVE' && campaign.endDate <= new Date())
      throw new ApiError('Extend the closing date before approval.');
    if (
      data.status === 'ACTIVE' &&
      (!campaign.owner.active || campaign.owner.approval !== 'APPROVED')
    )
      throw new ApiError('Approve the care partner account before activating this request.');
    await db.$transaction(async (tx) => {
      await tx.campaign.update({ where: { id }, data: { status: data.status as CampaignStatus } });
      if (['REJECTED', 'CANCELLED'].includes(data.status))
        await tx.donation.updateMany({
          where: { campaignId: id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
      await tx.auditLog.create({
        data: { userId: actor.id, action: `Campaign ${data.status.toLowerCase()}`, entityId: id },
      });
    });
    return NextResponse.json({ message: 'Campaign status updated.' });
  }
  if (resource === 'users' && id) {
    requireRole(['ADMIN']);
    const data = z
      .object({
        approval: z.enum(['APPROVED', 'REJECTED']).optional(),
        active: z.boolean().optional(),
      })
      .parse(body);
    if (actor.id === id) throw new ApiError('You cannot disable your own administrator account.');
    const target = await db.user.findUnique({ where: { id } });
    if (!target) throw new ApiError('User not found.', 404);
    if (data.approval && !['HOSPITAL', 'BLOOD_BANK'].includes(target.role))
      throw new ApiError('Only institutions require approval.');
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { ...data, approval: data.approval as Approval | undefined },
      });
      if (data.active === false || data.approval === 'REJECTED') {
        await tx.session.deleteMany({ where: { userId: id } });
        const campaigns = await tx.campaign.findMany({
          where: { ownerId: id, status: { in: ['ACTIVE', 'PENDING'] } },
          select: { id: true },
        });
        await tx.donation.updateMany({
          where: {
            status: 'PENDING',
            OR: [{ donorId: id }, { campaignId: { in: campaigns.map((c) => c.id) } }],
          },
          data: { status: 'CANCELLED' },
        });
        await tx.campaign.updateMany({
          where: { id: { in: campaigns.map((c) => c.id) } },
          data: { status: 'CANCELLED' },
        });
      }
      await tx.auditLog.create({
        data: { userId: actor.id, action: 'User account managed', entityId: id },
      });
    });
    return NextResponse.json({ message: 'User account updated.' });
  }
  if (resource === 'inventory') {
    requireRole(['BLOOD_BANK']);
    if (actor.approval !== 'APPROVED' || !actor.organization)
      throw new ApiError('Organization approval is required.', 403);
    const data = z
      .object({
        bloodGroup: z.enum(bloodGroups),
        units: z.coerce.number().int().min(1).max(500),
        batch: z.string().trim().min(3).max(60),
        expiresAt: z.coerce.date().min(new Date()),
      })
      .parse(body);
    await db.inventory.create({ data: { ...data, organizationId: actor.organization.id } });
    await audit(actor.id, 'Inventory batch added', data.batch);
    return NextResponse.json({ message: 'Inventory batch added.' }, { status: 201 });
  }
  if (resource === 'inventory-use' && id) {
    requireRole(['BLOOD_BANK']);
    if (actor.approval !== 'APPROVED' || !actor.organization)
      throw new ApiError('Organization approval is required.', 403);
    const { units } = z.object({ units: z.coerce.number().int().min(1).max(500) }).parse(body);
    const updated = await db.inventory.updateMany({
      where: {
        id,
        organizationId: actor.organization.id,
        units: { gte: units },
        expiresAt: { gt: new Date() },
      },
      data: { units: { decrement: units } },
    });
    if (!updated.count) throw new ApiError('Batch unavailable, expired, or insufficient stock.');
    await audit(actor.id, `Issued ${units} blood units`, id);
    return NextResponse.json({ message: 'Stock issued and recorded.' });
  }
  if (resource === 'updates' && id) {
    const { body: text } = z.object({ body: z.string().trim().min(10).max(1000) }).parse(body);
    const campaign = await db.campaign.findUnique({ where: { id } });
    if (!campaign || (campaign.ownerId !== actor.id && actor.role !== 'ADMIN'))
      throw new ApiError('Access denied.', 403);
    await db.campaignUpdate.create({ data: { campaignId: id, body: text } });
    return NextResponse.json({ message: 'Campaign update published.' });
  }
  if (resource === 'feedback' && id) {
    const data = z
      .object({
        rating: z.coerce.number().int().min(1).max(5),
        comment: z.string().trim().min(10).max(500),
      })
      .parse(body);
    const donation = await db.donation.findUnique({ where: { id } });
    if (!donation || donation.donorId !== actor.id || donation.status !== 'COMPLETED')
      throw new ApiError('Feedback requires your own completed donation.', 403);
    await db.feedback.create({ data: { ...data, donationId: id, authorId: actor.id } });
    return NextResponse.json({ message: 'Thank you for sharing your experience.' });
  }
  if (resource === 'feedback-delete' && id) {
    requireRole(['ADMIN']);
    await db.feedback.delete({ where: { id } });
    await audit(actor.id, 'Feedback moderated', id);
    return NextResponse.json({ message: 'Feedback removed.' });
  }
  if (resource === 'categories') {
    requireRole(['ADMIN']);
    const data = z.object({ name: z.string().trim().min(3).max(50) }).parse(body);
    await db.category.create({ data });
    return NextResponse.json({ message: 'Category created.' });
  }
  if (resource === 'settings') {
    requireRole(['ADMIN']);
    const { intervalDays } = z
      .object({ intervalDays: z.coerce.number().int().min(90).max(180) })
      .parse(body);
    await db.setting.upsert({
      where: { key: 'intervalDays' },
      create: { key: 'intervalDays', value: String(intervalDays) },
      update: { value: String(intervalDays) },
    });
    await audit(actor.id, 'Donation interval updated', 'settings');
    return NextResponse.json({ message: 'Screening interval updated.' });
  }
  if (resource === 'account-delete') {
    if (actor.role === 'ADMIN')
      throw new ApiError('Administrator accounts must be managed by another administrator.', 403);
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: actor.id }, data: { active: false, available: false } });
      await tx.session.deleteMany({ where: { userId: actor.id } });
      const campaigns = await tx.campaign.findMany({
        where: { ownerId: actor.id, status: { in: ['ACTIVE', 'PENDING'] } },
        select: { id: true },
      });
      await tx.donation.updateMany({
        where: {
          status: 'PENDING',
          OR: [{ donorId: actor.id }, { campaignId: { in: campaigns.map((c) => c.id) } }],
        },
        data: { status: 'CANCELLED' },
      });
      await tx.campaign.updateMany({
        where: { id: { in: campaigns.map((c) => c.id) } },
        data: { status: 'CANCELLED' },
      });
      await tx.auditLog.create({
        data: { userId: actor.id, action: 'Account deactivated', entityId: actor.id },
      });
    });
    (await cookies()).delete('portal_session');
    return NextResponse.json({
      message: 'Account deactivated. Donation records are retained.',
      redirect: '/',
    });
  }
  throw new ApiError('Resource not found.', 404);
}
async function safe(req: NextRequest, ctx: Context) {
  try {
    return await handle(req, ctx);
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Check the form fields.' },
        { status: 400 },
      );
    if (error instanceof ApiError)
      return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      return NextResponse.json(
        { error: 'That email, phone, reference, or record already exists.' },
        { status: 409 },
      );
    console.error('API request failed', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json(
      { error: 'We could not complete your request. Please try again.' },
      { status: 500 },
    );
  }
}
export const GET = safe;
export const POST = safe;
