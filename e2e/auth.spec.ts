import { test, expect, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * CR-08 end-to-end: guest path (zero Supabase traffic) and the full
 * admin -> student RBAC journey against the real project.
 *
 * Runs only when Supabase env is configured (.env.local picked up by
 * the dev server) AND admin credentials exist at
 * ~/.config/devin/secrets/practice_admin_credentials.json. Without
 * either, the suite self-skips so env-absent CI stays green (AC-A6).
 */

const CREDS_PATH = join(
  homedir(),
  '.config/devin/secrets/practice_admin_credentials.json',
);

function hasSupabaseEnv(): boolean {
  // The dev server decides via .env.local; mirror the check so the spec
  // knows which boot screen to expect.
  return existsSync(join(process.cwd(), '.env.local'));
}

function adminCreds(): { username: string; pin: string } | null {
  if (!existsSync(CREDS_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CREDS_PATH, 'utf-8'));
  } catch {
    return null;
  }
}

const configured = hasSupabaseEnv() && adminCreds() !== null;

async function login(page: Page, username: string, pin: string): Promise<void> {
  await page.goto('/');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-pin').fill(pin);
  await page.getByTestId('login-submit').click();
}

test.describe('CR-08 auth + RBAC (real backend)', () => {
  test.skip(!configured, 'Supabase env/admin creds absent - env-free mode');

  test('guest path: skips login, all 5 grades, zero supabase.co traffic', async ({ page }) => {
    const supaRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('supabase.co')) supaRequests.push(req.url());
    });
    await page.goto('/');
    await page.getByTestId('guest-button').click();
    await expect(page.getByTestId(/grade-card-/)).toHaveCount(5);
    // PostgREST/Auth traffic only happens after real login.
    expect(supaRequests.filter((u) => u.includes('/rest/') || u.includes('/auth/'))).toHaveLength(0);
  });

  test('full journey: admin provisions -> student sees only scoped grades', async ({ page }) => {
    const creds = adminCreds()!;
    const stamp = String(Date.now()).slice(-8);
    const studentUser = `hs${stamp}`; // <= 20 chars
    const className = `E2E-${stamp}`;
    page.on('dialog', (d) => void d.accept());

    await login(page, creds.username, creds.pin);
    await expect(page.getByTestId('admin-tab-accounts')).toBeVisible();

    // Create student account
    await page.getByTestId('account-username').fill(studentUser);
    await page.getByTestId('account-displayname').fill(`Bé E2E ${stamp}`);
    await page.getByTestId('account-pin').fill('123456');
    await page.getByTestId('account-create-submit').click();
    await expect(page.getByTestId(`account-row-${studentUser}`)).toBeVisible();

    // Create class
    await page.getByTestId('admin-tab-classes').click();
    await page.getByTestId('class-name').fill(className);
    await page.getByTestId('class-create-submit').click();
    await expect(page.getByTestId(`class-row-${className}`)).toBeVisible();

    // Enroll student
    await page.getByTestId('admin-tab-enroll').click();
    await page.getByTestId('enroll-class-select').selectOption({ label: className });
    await page.getByTestId(`enroll-toggle-${studentUser}`).click();
    await expect(page.getByTestId(`enroll-toggle-${studentUser}`)).toHaveText('Gỡ khỏi lớp');

    // Scope: grade-1 + grade-3 only
    await page.getByTestId('admin-tab-scope').click();
    await page.getByTestId('scope-class-select').selectOption({ label: className });
    await page.getByTestId('scope-grade-grade-1').click();
    await page.getByTestId('scope-grade-grade-3').click();
    await expect(page.getByTestId('scope-grade-grade-1')).toContainText('Đang mở');
    await expect(page.getByTestId('scope-grade-grade-3')).toContainText('Đang mở');

    // Sign out, then log in as the student
    await page.getByTestId('admin-signout').click();
    await login(page, studentUser, '123456');
    await expect(page.getByTestId('grade-card-grade-1')).toBeVisible();
    await expect(page.getByTestId('grade-card-grade-3')).toBeVisible();
    await expect(page.getByTestId(/grade-card-/)).toHaveCount(2);

    // Scoped batch actually starts
    await page.getByTestId('grade-card-grade-1').click();
    await page.getByTestId('start-batch-button').click();
    await expect(page.getByTestId('round-progress')).toBeVisible();

    // Sign out (reload lands on grade-select via the persisted session)
    // and clean up via admin
    await page.goto('/');
    await page.getByTestId('signout-button').click();
    await login(page, creds.username, creds.pin);
    await page.getByTestId(`account-row-${studentUser}`).getByText('Xóa').click();
    await expect(page.getByTestId(`account-row-${studentUser}`)).toHaveCount(0);
    await page.getByTestId('admin-tab-classes').click();
    await page.getByTestId(`class-row-${className}`).getByText('Xóa').click();
    await expect(page.getByTestId(`class-row-${className}`)).toHaveCount(0);
  });

  test('wrong PIN shows the Vietnamese error', async ({ page }) => {
    await login(page, 'admin', 'wrong-pin-000');
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page.getByTestId('login-error')).toContainText('chưa đúng');
  });
});
