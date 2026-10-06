import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const url = process.env.PREVIEW_URL || 'http://127.0.0.1:3001';
mkdirSync('docs/screenshots', { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1050 },
  deviceScaleFactor: 1,
});
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
async function shot(path, name) {
  await page.goto(url + path);
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: true });
}
await shot('/', '01-landing');
await shot('/campaigns', '02-campaign-listing');
const cards = await page.locator('.campaign-card').first().getAttribute('href');
await shot(cards, '03-campaign-details');
await shot('/login', '05-login');
await shot('/register', '06-registration');
async function login(email) {
  await page.goto(url + '/login');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.DEMO_PASSWORD || 'DemoPortal!2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/dashboard');
}
async function logout() {
  await page.request.post(url + '/api/auth/logout', { data: {}, headers: { origin: url } });
}
await login('donor@example.com');
await shot('/dashboard', '07-donor-dashboard');
await shot('/dashboard/history', '08-donation-history');
await shot(cards, '04-donation-workflow');
await logout();
await login('organization@example.com');
await shot('/dashboard', '09-organization-dashboard');
await logout();
await login('admin@example.com');
await shot('/dashboard', '10-admin-dashboard');
await shot('/dashboard/campaigns', '11-campaign-management');
await shot('/dashboard/users', '12-user-management');
await logout();
await login('bloodbank@example.com');
await shot('/dashboard/inventory', '13-blood-inventory');
await logout();
for (const width of [390, 768]) {
  await page.setViewportSize({ width, height: 900 });
  for (const path of [
    '/',
    '/campaigns',
    '/login',
    '/register',
    '/blood-banks',
    '/compatibility',
    '/donors',
    cards,
  ]) {
    await page.goto(url + path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error(`Overflow at ${width}px: ${path}`);
  }
}
await page.setViewportSize({ width: 390, height: 844 });
await shot('/', '14-mobile-landing');
await login('admin@example.com');
for (const path of ['/dashboard', '/dashboard/campaigns', '/dashboard/users']) {
  await page.goto(url + path);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (overflow) throw new Error(`Dashboard overflow: ${path}`);
}
await shot('/dashboard', '15-mobile-dashboard');
await logout();
await browser.close();
if (errors.length) throw new Error(errors.join('\n'));
console.info('Created 15 screenshots. Desktop/tablet/mobile checks passed with no page errors.');
