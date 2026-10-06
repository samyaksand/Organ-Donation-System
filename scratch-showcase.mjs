import { chromium } from 'playwright';
import path from 'node:path';

const OUT = 'C:\\Users\\DELL\\Desktop\\OrganProject\\Organ-Donation-System\\docs\\screenshots\\showcase';
const BASE = 'http://localhost:5173';

async function shot(page, file, { wait = 900 } = {}) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: path.join(OUT, file) });
  console.log('captured', file);
}

async function goto(page, url, wait = 900) {
  await page.goto(BASE + url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // 1. Landing
  await goto(page, '/', 1200);
  await shot(page, '01-landing.png');

  // 2. Explore organ availability
  await goto(page, '/organs', 1000);
  await shot(page, '02-organ-availability.png');

  // 3. Browse hospitals
  await goto(page, '/hospitals', 1000);
  await shot(page, '03-hospitals.png');

  // 4. Public analytics
  await goto(page, '/analytics', 1600);
  await shot(page, '04-public-analytics.png');

  // 5. Public investigation (initial state - no live AI call)
  await goto(page, '/investigate', 1000);
  await shot(page, '05-public-investigate.png');

  // 6. Donation pledge - complete the real flow
  await goto(page, '/pledge', 900);
  await page.locator('#pledge-name').fill('Vikram Sharma');
  await page.locator('#pledge-email').fill('vikram.showcase@example.com');
  await page.locator('#pledge-city').fill('Pune');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600);
  // Step 2: donation preference - pick Kidney
  await page.getByText('Kidney', { exact: true }).first().click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600);
  // Step 3: consent + submit
  await page.locator('input[type="checkbox"]').check();
  await page.waitForTimeout(300);
  await shot(page, '06-pledge-review.png', { wait: 300 });
  await page.getByRole('button', { name: 'Submit pledge' }).click();
  await page.waitForTimeout(1500);
  await shot(page, '06-pledge-confirmed.png');

  // 7. Generated certificate - open it in a new tab to capture
  const [certPage] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('link', { name: /Download certificate/i }).click(),
  ]);
  await certPage.waitForTimeout(1500);
  // Can't screenshot native PDF viewer reliably; just note the download happened.
  await certPage.close().catch(() => {});

  // 8. Admin login
  await goto(page, '/admin/login', 700);
  await page.locator('input[type="email"]').fill('demo.admin@example.com');
  await shot(page, '08-admin-login.png', { wait: 200 });
  await page.locator('input[type="password"]').fill('DemoPass123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === '/admin', { timeout: 15000 });

  // 9. Admin dashboard
  await shot(page, '09-admin-dashboard.png', { wait: 1400 });

  // 10. Admin analytics
  await goto(page, '/admin/analytics', 1800);
  await shot(page, '10-admin-analytics.png');

  // 11. Organ request - open an existing pending one
  await goto(page, '/admin/organ-requests', 1000);
  await shot(page, '11-organ-requests.png');
  const rowMenuButton = page.locator('table tbody tr').first().getByRole('button').last();
  await rowMenuButton.click();
  await page.waitForTimeout(300);
  await page.getByText('View details').click();
  await page.waitForTimeout(1000);
  await shot(page, '11-organ-request-detail.png');

  // 12. Workflow timeline (same detail page's timeline panel, already visible)
  await shot(page, '12-workflow-timeline.png', { wait: 400 });

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
