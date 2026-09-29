import { type Page, expect } from '@playwright/test';

/**
 * CR-08: navigates to the app and reaches grade-select as a guest.
 * When Supabase env is configured the app boots to the login screen -
 * every pre-CR-08 spec exercises the guest path, which is a first-class
 * product flow (try-before-login), so pressing "Chơi không cần tài
 * khoản" is the correct entry, not a test shim.
 * When env is absent the app boots straight to grade-select and the
 * guest-button check simply no-ops.
 */
export async function gotoApp(page: Page): Promise<void> {
  // Force the guest-only path BEFORE app scripts run: non-auth specs
  // must not depend on a live Supabase session probe (it stalled under
  // parallel-suite load). auth.spec.ts drives raw page.goto('/') and
  // still exercises the real configured flows.
  await page.addInitScript(() => {
    try {
      localStorage.setItem('beheo-force-guest', '1');
    } catch {
      // storage blocked - the env gate alone decides the boot mode
    }
  });
  await page.goto('/');
  const guest = page.getByTestId('guest-button');
  if (await guest.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await guest.click();
  }
  await expect(page.getByTestId(/grade-card-/).first()).toBeVisible({ timeout: 15_000 });
}
