import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

// Public captures for docs/screenshot-checklist.md.
// Authenticated studio shots need DEMO_EMAIL + DEMO_PASSWORD after the demo seed.
const outDir = resolve(__dirname, '../../docs/screenshots');
mkdirSync(outDir, { recursive: true });

const brandId =
  process.env.DEMO_BRAND_ID || '11111111-1111-4111-8111-111111111111';

test.describe('docs screenshots', () => {
  test.skip(!process.env.CAPTURE, 'Set CAPTURE=1 to write docs/screenshots');
  test.use({ viewport: { width: 1440, height: 900 } });

  test('01 landing desktop', async ({ page }) => {
    await page.goto('/');
    await page.getByText(/your own studio/i).waitFor();
    await page.screenshot({
      path: resolve(outDir, '01-landing-desktop.png'),
      fullPage: false,
    });
  });

  test('01 landing mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByText(/your own studio/i).waitFor();
    await page.screenshot({
      path: resolve(outDir, '01-landing-mobile.png'),
      fullPage: false,
    });
  });

  test('07 login desktop', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Log in', { exact: true }).first().waitFor();
    await page.screenshot({
      path: resolve(outDir, '07-login-desktop.png'),
      fullPage: false,
    });
  });

  test('authenticated studio shots', async ({ page }) => {
    const email = process.env.DEMO_EMAIL;
    const password = process.env.DEMO_PASSWORD;
    test.skip(
      !email || !password,
      'Set DEMO_EMAIL and DEMO_PASSWORD after seeding the demo account',
    );

    await page.goto('/login');
    await page.locator('input[type="email"]').first().fill(email!);
    await page.locator('input[type="password"]').first().fill(password!);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/brands/, { timeout: 30_000 });

    const shots: Array<[string, string]> = [
      [`/${brandId}`, '02-generate-desktop.png'],
      [`/${brandId}/kit`, '03-kit-desktop.png'],
      [`/${brandId}/history`, '04-history-desktop.png'],
      [`/${brandId}/keys`, '05-keys-desktop.png'],
      ['/admin', '06-admin-desktop.png'],
    ];
    for (const [path, file] of shots) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: resolve(outDir, file), fullPage: false });
    }
  });
});
