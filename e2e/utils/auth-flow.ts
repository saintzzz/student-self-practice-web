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
  await page.goto('/');
  const guest = page.getByTestId('guest-button');
  if (await guest.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await guest.click();
  }
  await expect(page.getByTestId(/grade-card-/).first()).toBeVisible();
}
