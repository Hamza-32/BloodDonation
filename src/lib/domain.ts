export const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;
export const compatibility: Record<string, string[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': [...bloodGroups],
};
export function compatible(donor: string, recipient: string) {
  return compatibility[recipient]?.includes(donor) ?? false;
}
export function eligibility(
  user: { birthDate: Date | null; weight: number | null; lastDonation: Date | null },
  now = new Date(),
  intervalDays = 90,
) {
  if (!user.birthDate || !user.weight)
    return { eligible: false, reason: 'Add your date of birth and weight to your profile first.' };
  const age = (now.getTime() - user.birthDate.getTime()) / (365.25 * 86400000);
  if (age < 18 || age >= 66)
    return { eligible: false, reason: 'This portal accepts donors aged 18–65.' };
  if (user.weight < 50)
    return { eligible: false, reason: 'This portal requires a minimum weight of 50 kg.' };
  if (user.lastDonation) {
    const next = new Date(user.lastDonation.getTime() + intervalDays * 86400000);
    if (next > now)
      return {
        eligible: false,
        reason: `Your next donation date is ${next.toISOString().slice(0, 10)}.`,
      };
  }
  return {
    eligible: true,
    reason:
      'You meet the portal screening rules. Clinical screening is required at the donation center.',
  };
}
export function progress(donations: { status: string; units: number }[], target: number) {
  const raised = donations
    .filter((d) => d.status === 'COMPLETED')
    .reduce((sum, d) => sum + d.units, 0);
  return {
    raised,
    percent: Math.min(100, Math.round((raised / target) * 100)),
    remaining: Math.max(0, target - raised),
  };
}
