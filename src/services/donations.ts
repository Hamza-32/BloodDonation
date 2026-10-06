import type { User, DonationStatus } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { db } from '@/lib/db';
import { ApiError } from '@/lib/errors';
import { compatible, eligibility } from '@/lib/domain';

export async function pledgeDonation(
  actor: User,
  data: { campaignId: string; scheduledAt: Date; note: string },
) {
  const interval = Number(
    (await db.setting.findUnique({ where: { key: 'intervalDays' } }))?.value || 90,
  );
  const check = eligibility(actor, new Date(), interval);
  if (!check.eligible) throw new ApiError(check.reason);
  const donation = await db.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({ where: { id: data.campaignId } });
    if (!campaign || campaign.status !== 'ACTIVE' || campaign.endDate <= new Date())
      throw new ApiError('This request is no longer accepting pledges.');
    if (!compatible(actor.bloodGroup, campaign.bloodGroup))
      throw new ApiError('Your blood group is not compatible with this request.');
    if (data.scheduledAt <= new Date() || data.scheduledAt > campaign.endDate)
      throw new ApiError('Choose a future appointment before the request closes.');
    if (await tx.donation.count({ where: { donorId: actor.id, status: 'PENDING' } }))
      throw new ApiError('You already have a pending appointment. Complete or cancel it first.');
    const committed = await tx.donation.aggregate({
      where: { campaignId: campaign.id, status: { in: ['PENDING', 'COMPLETED'] } },
      _sum: { units: true },
    });
    if ((committed._sum.units || 0) >= campaign.targetUnits)
      throw new ApiError('All required units are already pledged.');
    const created = await tx.donation.create({
      data: {
        ...data,
        donorId: actor.id,
        reference: `DP-${randomBytes(6).toString('hex').toUpperCase()}`,
      },
    });
    await tx.auditLog.create({
      data: { userId: actor.id, action: 'Donation pledged', entityId: created.id },
    });
    return created;
  });
  return donation;
}

export async function transitionDonation(
  actor: User,
  id: string,
  status: Exclude<DonationStatus, 'PENDING'>,
) {
  await db.$transaction(async (tx) => {
    const donation = await tx.donation.findUnique({
      where: { id },
      include: { campaign: true, donor: true },
    });
    if (!donation) throw new ApiError('Donation not found.', 404);
    const manager =
      actor.role === 'ADMIN' ||
      (['HOSPITAL', 'BLOOD_BANK'].includes(actor.role) &&
        actor.id === donation.campaign.ownerId &&
        actor.approval === 'APPROVED');
    if (!manager && !(actor.id === donation.donorId && status === 'CANCELLED'))
      throw new ApiError(
        'Only the receiving institution or an administrator can confirm donations.',
        403,
      );
    if (donation.status !== 'PENDING') throw new ApiError('This donation is already finalized.');
    if (status === 'COMPLETED') {
      if (donation.campaign.status !== 'ACTIVE')
        throw new ApiError('The campaign must be active to confirm a donation.');
      const interval = Number(
        (await tx.setting.findUnique({ where: { key: 'intervalDays' } }))?.value || 90,
      );
      const check = eligibility(donation.donor, new Date(), interval);
      if (!check.eligible) throw new ApiError(check.reason);
      await tx.user.update({
        where: { id: donation.donorId },
        data: { lastDonation: new Date() },
      });
    }
    const changed = await tx.donation.updateMany({
      where: { id, status: 'PENDING' },
      data: {
        status: status,
        completedAt: status === 'COMPLETED' ? new Date() : null,
      },
    });
    if (!changed.count) throw new ApiError('Donation status changed. Refresh and try again.');
    const total = await tx.donation.aggregate({
      where: { campaignId: donation.campaignId, status: 'COMPLETED' },
      _sum: { units: true },
    });
    if ((total._sum.units || 0) >= donation.campaign.targetUnits)
      await tx.campaign.update({
        where: { id: donation.campaignId },
        data: { status: 'COMPLETED' },
      });
    await tx.auditLog.create({
      data: { userId: actor.id, action: `Donation ${status.toLowerCase()}`, entityId: id },
    });
  });
}
