import test from 'node:test';
import assert from 'node:assert/strict';
import { compatible, bloodGroups, eligibility, progress } from '../src/lib/domain';
import { registrationSchema, campaignSchema } from '../src/lib/validation';
import { hashPassword, verifyPassword } from '../src/lib/auth';
test('red-cell compatibility covers all eight groups', () => {
  for (const group of bloodGroups) {
    assert.equal(compatible('O-', group), true);
    assert.equal(compatible(group, 'AB+'), true);
    assert.equal(compatible(group, group), true);
  }
  assert.equal(compatible('A+', 'B+'), false);
  assert.equal(compatible('O+', 'O-'), false);
  assert.equal(compatible('AB-', 'AB+'), true);
  assert.equal(compatible('invalid', 'A+'), false);
});
test('screening enforces age, weight and interval boundaries', () => {
  const now = new Date('2026-10-07');
  const person = { birthDate: new Date('1998-01-01'), weight: 65, lastDonation: null };
  assert.equal(eligibility(person, now).eligible, true);
  assert.equal(eligibility({ ...person, weight: 40 }, now).eligible, false);
  assert.equal(eligibility({ ...person, birthDate: new Date('2012-01-01') }, now).eligible, false);
  assert.equal(eligibility({ ...person, birthDate: null }, now).eligible, false);
  assert.equal(
    eligibility({ ...person, lastDonation: new Date('2026-10-01') }, now).eligible,
    false,
  );
  assert.equal(
    eligibility({ ...person, lastDonation: new Date(now.getTime() - 90 * 86400000) }, now).eligible,
    true,
  );
});
test('only completed donations contribute to progress', () => {
  assert.deepEqual(
    progress(
      [
        { status: 'PENDING', units: 1 },
        { status: 'COMPLETED', units: 2 },
        { status: 'FAILED', units: 1 },
      ],
      5,
    ),
    { raised: 2, percent: 40, remaining: 3 },
  );
  assert.equal(progress([{ status: 'COMPLETED', units: 8 }], 5).percent, 100);
});
test('password hashes are salted and validated securely', () => {
  const first = hashPassword('StrongPassword!2026'),
    second = hashPassword('StrongPassword!2026');
  assert.notEqual(first, second);
  assert.equal(verifyPassword('StrongPassword!2026', first), true);
  assert.equal(verifyPassword('wrong', first), false);
});
test('registration rejects weak credentials and unlicensed institutions', () => {
  const data = {
    name: 'Demo Person',
    email: 'demo@example.com',
    phone: '01712345678',
    password: 'StrongPassword!2026',
    city: 'Dhaka',
    bloodGroup: 'O-',
    role: 'DONOR',
  };
  assert.equal(registrationSchema.safeParse(data).success, true);
  assert.equal(registrationSchema.safeParse({ ...data, password: 'abc123' }).success, false);
  assert.equal(registrationSchema.safeParse({ ...data, role: 'ADMIN' }).success, false);
  assert.equal(registrationSchema.safeParse({ ...data, role: 'HOSPITAL' }).success, false);
});
test('campaign validation rejects past dates and negative targets', () => {
  const data = {
    title: 'Community blood drive',
    description: 'A clear explanation of the donation drive and the care team coordinating it.',
    bloodGroup: 'O+',
    targetUnits: 3,
    city: 'Dhaka',
    hospital: 'Community Hospital',
    contact: '01712345678',
    categoryId: 'demo',
    urgency: 'STANDARD',
    endDate: new Date(Date.now() + 86400000),
  };
  assert.equal(campaignSchema.safeParse(data).success, true);
  assert.equal(campaignSchema.safeParse({ ...data, targetUnits: -1 }).success, false);
  assert.equal(campaignSchema.safeParse({ ...data, endDate: '2020-01-01' }).success, false);
});
