import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').fill('dnmum001@example.com');
  await page.locator('input[type="password"]').fill('DemoPass123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => url.pathname === '/donor', { timeout: 15000 });

  await page.goto(BASE + '/donor/security', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'scratch-security-overview.png' });

  await page.getByRole('tab', { name: 'Active sessions' }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'scratch-security-sessions.png' });

  await page.getByRole('tab', { name: 'Privacy & access' }).click();
  await page.waitForTimeout(800);
  const firstItem = page.locator('button', { hasText: 'Profile' }).first();
  await firstItem.click().catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'scratch-security-privacy.png' });

  await browser.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
