import { expect, test } from '@playwright/test';

// Phase 03 — landing copy is now expected at `/`. Logged-in redirect is NOT
// tested here (no real user); unauthenticated visitors should see the public
// landing, not bounce to /login.

test.describe('smoke', () => {
  test('login page renders the Log in heading', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Log in', { exact: true }).first()).toBeVisible();
  });

  test('unauthenticated /brands redirects to /login', async ({ page }) => {
    await page.goto('/brands');
    await expect(page).toHaveURL(/\/login/);
  });

  test('GET / does not 5xx', async ({ request }) => {
    const response = await request.get('/', { maxRedirects: 0 });
    expect(response.status()).toBeLessThan(500);
  });

  test('unauthenticated / shows the public landing hero copy', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/your own studio/i)).toBeVisible();
  });
});