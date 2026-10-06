import { test, expect, APIRequestContext } from '@playwright/test';
const origin = 'http://127.0.0.1:3100';
const post = (request: APIRequestContext, path: string, data: unknown) =>
  request.post(`/api/${path}`, { data, headers: { origin } });
const login = (request: APIRequestContext, email: string) =>
  post(request, 'auth/login', { email, password: 'TestPortal!2026' });
test.describe.serial('complete donation lifecycle and access boundaries', () => {
  let campaignId: string;
  let donationId: string;
  let categoryId: string;
  test('public browsing, searching, compatibility and protected routes', async ({
    page,
    request,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('A little of you.');
    await page.goto('/campaigns?blood=O-');
    await expect(page.locator('.campaign-card')).toHaveCount(1);
    await page.goto('/campaigns?q=no-such-request');
    await expect(page.getByText('No requests match your search')).toBeVisible();
    await page.goto('/compatibility');
    await page.getByRole('combobox').selectOption('AB+');
    await expect(page.locator('.compat-grid .blood-tag')).toHaveCount(9);
    await page.goto('/dashboard/users');
    await expect(page).toHaveURL(/login/);
    expect((await post(request, 'donations', {})).status()).toBe(401);
    expect(
      (
        await request.post('/api/auth/login', {
          data: { email: 'admin@example.com', password: 'TestPortal!2026' },
          headers: { origin: 'https://evil.example' },
        })
      ).status(),
    ).toBe(403);
    const campaigns = await (await request.get('/api/campaigns')).json();
    categoryId = campaigns[0].categoryId;
  });
  test('registration, validation, login and logout work through UI', async ({ page, request }) => {
    await page.goto('/register');
    await page.getByLabel('Full name / organization').fill('Test Donor');
    await page.getByLabel('Email address').fill('e2e@example.com');
    await page.getByLabel('Phone number', { exact: true }).fill('01711112222');
    await page.getByLabel('City', { exact: true }).fill('Dhaka');
    await page.getByLabel('Blood group', { exact: true }).selectOption('O-');
    await page.getByLabel('Password', { exact: true }).fill('TestPortal!2026');
    await page.getByRole('button', { name: 'Create my account' }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/dashboard/profile');
    await page.getByLabel('Date of birth').fill('1997-01-01');
    await page.getByLabel('Weight (kg)').fill('65');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('status')).toContainText('updated');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL(origin + '/');
    expect(
      (
        await post(request, 'auth/login', { email: 'donor@example.com', password: 'wrong' })
      ).status(),
    ).toBe(401);
    expect(
      (
        await post(request, 'auth/register', {
          name: 'Invalid',
          email: 'bad',
          phone: 'abc',
          password: 'short',
          city: 'Dhaka',
          bloodGroup: 'O-',
          role: 'ADMIN',
        })
      ).status(),
    ).toBe(400);
    await page.goto('/login');
    await page.getByLabel('Email address').fill('e2e@example.com');
    await page.getByLabel('Password', { exact: true }).fill('TestPortal!2026');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.goto('/dashboard/users');
    await expect(page).toHaveURL(/dashboard\?error=Access/);
  });
  test('approved institution creates and edits a campaign; admin reviews it', async ({
    request,
  }) => {
    expect((await login(request, 'pending@example.com')).ok()).toBe(true);
    const data = {
      title: 'E2E community appointment drive',
      description:
        'A complete integration test of request creation, review, appointment pledging, and care partner confirmation.',
      bloodGroup: 'O+',
      targetUnits: 1,
      city: 'Dhaka',
      hospital: 'Dhaka Community Hospital',
      contact: '01700000003',
      categoryId,
      urgency: 'STANDARD',
      endDate: new Date(Date.now() + 10 * 86400000).toISOString(),
    };
    expect((await post(request, 'campaigns', data)).status()).toBe(403);
    await login(request, 'organization@example.com');
    expect((await post(request, 'campaigns', { ...data, targetUnits: -1 })).status()).toBe(400);
    expect((await post(request, 'campaigns', data)).status()).toBe(201);
    const { PrismaClient } = await import('@prisma/client');
    const db = new PrismaClient({ datasourceUrl: 'file:./test.db' });
    const campaign = await db.campaign.findFirstOrThrow({ where: { title: data.title } });
    campaignId = campaign.id;
    expect(
      (
        await post(request, `campaigns/${campaignId}`, {
          ...data,
          title: 'E2E edited community appointment drive',
        })
      ).ok(),
    ).toBe(true);
    await login(request, 'admin@example.com');
    expect((await post(request, `campaign-status/${campaignId}`, { status: 'ACTIVE' })).ok()).toBe(
      true,
    );
    expect((await request.get(`/api/campaigns/${campaignId}`)).ok()).toBe(true);
    await db.$disconnect();
  });
  test('donor pledges; duplicates and unauthorized confirmation are rejected', async ({
    page,
    request,
  }) => {
    await login(request, 'donor@example.com');
    const data = {
      campaignId,
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      note: 'E2E pledge',
    };
    expect((await post(request, 'donations', data)).status()).toBe(201);
    const history = await (await request.get('/api/history')).json();
    donationId = history.find((d: { campaignId: string }) => d.campaignId === campaignId).id;
    expect((await post(request, 'donations', data)).status()).toBe(400);
    expect((await post(request, `donations/${donationId}`, { status: 'COMPLETED' })).status()).toBe(
      403,
    );
    await page.goto(`/campaigns/${campaignId}`);
    await expect(page.getByText('of 1 units confirmed')).toBeVisible();
    const campaign = await (await request.get(`/api/campaigns/${campaignId}`)).json();
    expect(
      campaign.donations.filter((d: { status: string }) => d.status === 'COMPLETED'),
    ).toHaveLength(0);
  });
  test('institution confirmation updates totals once and enforces the donation interval', async ({
    request,
  }) => {
    await login(request, 'organization@example.com');
    expect((await post(request, `donations/${donationId}`, { status: 'COMPLETED' })).ok()).toBe(
      true,
    );
    expect((await post(request, `donations/${donationId}`, { status: 'COMPLETED' })).status()).toBe(
      400,
    );
    const campaign = await (await request.get(`/api/campaigns/${campaignId}`)).json();
    expect(campaign.status).toBe('COMPLETED');
    expect(
      campaign.donations.filter((d: { status: string }) => d.status === 'COMPLETED'),
    ).toHaveLength(1);
    await login(request, 'donor@example.com');
    const other = (await (await request.get('/api/campaigns')).json()).find(
      (c: { status: string }) => c.status === 'ACTIVE',
    );
    expect(
      (
        await post(request, 'donations', {
          campaignId: other.id,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await post(request, `feedback/${donationId}`, {
          rating: 5,
          comment: 'A thoughtful and welcoming care team.',
        })
      ).ok(),
    ).toBe(true);
    expect(
      (
        await post(request, `feedback/${donationId}`, {
          rating: 5,
          comment: 'A second feedback should be rejected.',
        })
      ).status(),
    ).toBe(409);
    const csv = await request.get('/api/history?format=csv');
    expect(csv.headers()['content-type']).toContain('text/csv');
    expect(await csv.text()).toContain('COMPLETED');
  });
  test('failed and cancelled pledges never increment totals', async ({ request }) => {
    await login(request, 'e2e@example.com');
    const campaigns = await (await request.get('/api/campaigns')).json();
    const campaign = campaigns.find(
      (c: { status: string; bloodGroup: string }) => c.status === 'ACTIVE' && c.bloodGroup === 'O-',
    );
    expect(
      (
        await post(request, 'donations', {
          campaignId: campaign.id,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        })
      ).status(),
    ).toBe(201);
    let history = await (await request.get('/api/history')).json();
    const failedId = history[0].id;
    await login(request, 'organization@example.com');
    expect((await post(request, `donations/${failedId}`, { status: 'FAILED' })).ok()).toBe(true);
    await login(request, 'e2e@example.com');
    expect(
      (
        await post(request, 'donations', {
          campaignId: campaign.id,
          scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        })
      ).status(),
    ).toBe(201);
    history = await (await request.get('/api/history')).json();
    const cancelledId = history.find((d: { status: string }) => d.status === 'PENDING').id;
    expect((await post(request, `donations/${cancelledId}`, { status: 'CANCELLED' })).ok()).toBe(
      true,
    );
    const after = await (await request.get(`/api/campaigns/${campaign.id}`)).json();
    expect(after.donations.filter((d: { status: string }) => d.status === 'COMPLETED').length).toBe(
      campaign.donations.filter((d: { status: string }) => d.status === 'COMPLETED').length,
    );
  });
  test('admin approval, user management, inventory ownership and input validation', async ({
    request,
  }) => {
    const { PrismaClient } = await import('@prisma/client');
    const db = new PrismaClient({ datasourceUrl: 'file:./test.db' });
    await login(request, 'admin@example.com');
    const pending = await db.user.findUniqueOrThrow({ where: { email: 'pending@example.com' } });
    expect((await post(request, `users/${pending.id}`, { approval: 'APPROVED' })).ok()).toBe(true);
    const person = await db.user.findUniqueOrThrow({ where: { email: 'e2e@example.com' } });
    expect((await post(request, `users/${person.id}`, { active: false })).ok()).toBe(true);
    expect((await login(request, 'e2e@example.com')).status()).toBe(401);
    await login(request, 'bloodbank@example.com');
    expect(
      (
        await post(request, 'inventory', {
          bloodGroup: 'B+',
          units: 4,
          batch: 'E2E-BATCH',
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        })
      ).status(),
    ).toBe(201);
    const batch = await db.inventory.findUniqueOrThrow({ where: { batch: 'E2E-BATCH' } });
    expect((await post(request, `inventory-use/${batch.id}`, { units: 1 })).ok()).toBe(true);
    expect((await db.inventory.findUniqueOrThrow({ where: { id: batch.id } })).units).toBe(3);
    expect((await post(request, `inventory-use/${batch.id}`, { units: 9 })).status()).toBe(400);
    await login(request, 'organization@example.com');
    expect((await post(request, `inventory-use/${batch.id}`, { units: 1 })).status()).toBe(403);
    await db.$disconnect();
  });
});
