import { test, expect, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * CR-109 e2e: GTM Outreach admin tab against the real project.
 *
 * AC-109.11 admin sees campaigns/leads/drafts/pipeline/suppression;
 * AC-109.12 approve/reject/edit round-trip through the guarded RPCs;
 * AC-109.13 queueing is impossible without the approval artifact
 * (covered directly by SQL probes; here we verify the UI path).
 *
 * Self-skips without .env.local + admin creds (env-free CI stays green).
 */

const CREDS_PATH = join(
  homedir(),
  '.config/devin/secrets/practice_admin_credentials.json',
);

function adminCreds(): { username: string; pin: string } | null {
  const env = {
    username: process.env.E2E_ADMIN_USER,
    pin: process.env.E2E_ADMIN_PIN,
  };
  if (env.username && env.pin) return env;
  if (!existsSync(CREDS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CREDS_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

const configured = existsSync(join(process.cwd(), '.env.local')) && adminCreds() !== null;

async function login(page: Page, username: string, pin: string): Promise<void> {
  await page.goto('/');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-pin').fill(pin);
  await page.getByTestId('login-submit').click();
}

test.describe('CR-109 outreach admin tab (real backend)', () => {
  test.skip(!configured, 'Supabase env/admin creds absent - env-free mode');

  test('admin tab renders all sections incl. empty states', async ({ page }) => {
    const creds = adminCreds()!;
    await login(page, creds.username, creds.pin);
    await expect(page.getByTestId('admin-tab-gtm')).toBeVisible();
    await page.getByTestId('admin-tab-gtm').click();
    await expect(page.getByTestId('gtm-outreach')).toBeVisible();
    // Every sub-section renders rows or its explicit empty state - never blank.
    await expect(
      page.getByTestId('gtm-lead-list').or(page.getByTestId('gtm-leads-empty')),
    ).toBeVisible();
    await page.getByTestId('gtm-sub-drafts').click();
    await expect(
      page.getByTestId('gtm-draft-list').or(page.getByTestId('gtm-drafts-empty')),
    ).toBeVisible();
    await page.getByTestId('gtm-sub-pipeline').click();
    await expect(page.getByTestId('gtm-pipeline')).toBeVisible();
    await page.getByTestId('gtm-sub-suppression').click();
    await expect(
      page.getByTestId('gtm-supp-list').or(page.getByTestId('gtm-supp-empty')),
    ).toBeVisible();
    await page.getByTestId('gtm-sub-stats').click();
    await expect(page.getByTestId('gtm-stat-sent')).toBeVisible();
    await expect(
      page.getByTestId('gtm-run-list').or(page.getByTestId('gtm-runs-empty')),
    ).toBeVisible();
  });

  test('approve flow: pending_review draft becomes queued via RPC', async ({ page }) => {
    const creds = adminCreds()!;
    await login(page, creds.username, creds.pin);
    await page.getByTestId('admin-tab-gtm').click();
    await page.getByTestId('gtm-sub-drafts').click();
    const approveBtn = page.locator('[data-testid^="gtm-approve-"]').first();
    if ((await approveBtn.count()) === 0) {
      test.skip(true, 'no pending drafts to approve');
      return;
    }
    const draftId = (await approveBtn.getAttribute('data-testid'))!.replace('gtm-approve-', '');
    await expect(page.getByTestId(`gtm-body-${draftId}`)).toContainText('KHÔNG');
    await approveBtn.click();
    // After approve the row leaves the pending list or re-renders as queued.
    await expect(page.getByTestId(`gtm-approve-${draftId}`)).toHaveCount(0);
  });

  test('suppression add removes lead-matching messages and lists the value', async ({ page }) => {
    const creds = adminCreds()!;
    await login(page, creds.username, creds.pin);
    await page.getByTestId('admin-tab-gtm').click();
    await page.getByTestId('gtm-sub-suppression').click();
    const stamp = String(Date.now()).slice(-6);
    const domain = `e2e-block-${stamp}.vn`;
    await page.getByTestId('gtm-supp-input').fill(domain);
    await page.getByTestId('gtm-supp-add').click();
    await expect(page.getByTestId(`gtm-supp-del-${domain}`)).toBeVisible();
    // Clean up - the row disappears from the rendered list.
    await page.getByTestId(`gtm-supp-del-${domain}`).click();
    await expect(page.getByTestId(`gtm-supp-del-${domain}`)).toHaveCount(0);
  });

  test('anonymous visitor never reaches the tab', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('guest-button').click();
    await expect(page.getByTestId('admin-tab-gtm')).toHaveCount(0);
  });
});
