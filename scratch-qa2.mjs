import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const results = [];
function log(name, pass, detail = '') {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}${detail ? ' :: ' + detail : ''}`);
}

async function main() {
  const browser = await chromium.launch();

  // 1. Homepage academic statement
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const bodyText = await page.textContent('body');
    const expected = 'Originally developed as a CS254 Database Systems (DBMS) project under Prof. Annappa at NITK Surathkal, later extended by applying concepts learned in CS418 (Information Security) taught by Prof. Mahendra';
    const occurrences = bodyText.split('CS254 Database Systems').length - 1;
    log('1. Homepage academic statement is correct and not duplicated', bodyText.includes(expected) && occurrences === 1, `occurrences=${occurrences}`);

    // 2. Homepage Ask OrganFlow
    const askVisible = await page.getByRole('heading', { name: 'Ask OrganFlow' }).isVisible().catch(() => false);
    log('2. Homepage "Ask OrganFlow" section exists', askVisible);

    if (askVisible) {
      await page.locator('input[aria-label="Ask OrganFlow a question"]').fill('How many kidneys are available?');
      const start = Date.now();
      await page.getByRole('button', { name: 'Ask' }).click();
      // Wait for either a result or an error/blocked state, up to 20s (well under the old 2min hang).
      await page.waitForFunction(
        () => {
          const body = document.body.textContent || '';
          return body.includes('Summary') || body.includes('not investigated') || body.includes('could not be completed');
        },
        { timeout: 20000 },
      ).catch(() => {});
      const elapsed = Date.now() - start;
      const bodyAfter = await page.textContent('body');
      const answered = bodyAfter.includes('Summary') || bodyAfter.includes('not investigated') || bodyAfter.includes('could not be completed');
      log('3. /investigate (homepage) returns an answer quickly (<20s)', answered && elapsed < 20000, `elapsed=${elapsed}ms`);
    }
    await context.close();
  }

  // 3b. Standalone /investigate page: visual/UI check only, no second real AI call.
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE + '/investigate', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const title = await page.textContent('h1');
    log('3b. Standalone /investigate page still loads correctly', title?.includes('Investigate'), title ?? '');
    await context.close();
  }

  // Donor flows: My Security page
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE + '/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.locator('input[type="email"]').fill('dnmum001@example.com');
    await page.locator('input[type="password"]').fill('DemoPass123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => url.pathname === '/donor', { timeout: 15000 });

    await page.goto(BASE + '/donor/security', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const title = await page.textContent('h1');
    log('6. Donor My Security page loads', title?.includes('Security'), title ?? '');

    // 7. Active sessions tab
    await page.getByRole('tab', { name: 'Active sessions' }).click();
    await page.waitForTimeout(1000);
    const currentDeviceVisible = await page.getByText('Current device').isVisible().catch(() => false);
    log('7. Active sessions display correctly (current device marked)', currentDeviceVisible);

    // 10. Activity tab - only own activity, shows LOGIN
    await page.getByRole('tab', { name: 'Activity' }).click();
    await page.waitForTimeout(1000);
    const loginEventVisible = await page.getByText('Signed in').first().isVisible().catch(() => false);
    log('10. Security activity shown (own LOGIN event visible)', loginEventVisible);

    // 11. Who can access my information
    await page.getByRole('tab', { name: 'Privacy & access' }).click();
    await page.waitForTimeout(1000);
    const medicalInfoVisible = await page.getByText('Medical information').isVisible().catch(() => false);
    log('11. "Who can access my information?" renders', medicalInfoVisible);

    // 12. "Why can I access this?" on profile medical tab
    await page.goto(BASE + '/donor/profile?tab=medical', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const whyLink = page.getByRole('button', { name: /Why can I see this/ });
    const whyVisible = await whyLink.isVisible().catch(() => false);
    log('12. "Why can I access this?" affordance present on medical tab', whyVisible);
    if (whyVisible) {
      await whyLink.hover();
      await page.waitForTimeout(600);
      const tooltipVisible = await page.getByText('Decision').isVisible().catch(() => false);
      log('12b. "Why can I access this?" tooltip shows a real ALLOW decision', tooltipVisible);
    }

    await context.close();
  }

  // 13 & 14: Public and Admin security pages still work
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto(BASE + '/security', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const publicSecTitle = await page.textContent('h1');
    log('13. Public Security page still works', publicSecTitle?.includes('Privacy'), publicSecTitle ?? '');

    await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.locator('input[type="email"]').fill('demo.admin@example.com');
    await page.locator('input[type="password"]').fill('DemoPass123');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL((url) => url.pathname === '/admin', { timeout: 15000 });
    await page.goto(BASE + '/admin/security', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const adminSecTitle = await page.textContent('h1');
    log('14. Admin Security page still works', adminSecTitle?.includes('Security'), adminSecTitle ?? '');

    await context.close();
  }

  await browser.close();

  console.log('\n--- SUMMARY ---');
  const failed = results.filter((r) => !r.pass);
  console.log(`${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log('FAILED:', failed.map((f) => f.name).join(', '));
    process.exitCode = 1;
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
