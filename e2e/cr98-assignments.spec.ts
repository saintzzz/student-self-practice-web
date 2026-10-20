import { test, expect, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * CR-98 end-to-end: teacher assigns a fixed form -> student takes the
 * SAME đề -> submission grades -> teacher report + remediation.
 *
 * Provisioning reuses the auth.spec convention - an admin context
 * creates the student + class + scope, then the assign tab issues the
 * đề (admin can act on any class; a role='teacher' account would scope
 * to its own classes the same way through RLS).
 *
 * Needs .env.local (Supabase) plus admin credentials at
 * ~/.config/devin/secrets/practice_admin_credentials.json; without
 * either, the suite self-skips so env-free CI stays green.
 */

const CREDS_PATH = join(
  homedir(),
  '.config/devin/secrets/practice_admin_credentials.json',
);

const configured =
  existsSync(join(process.cwd(), '.env.local')) && existsSync(CREDS_PATH);

function adminCreds(): { username: string; pin: string } {
  return JSON.parse(readFileSync(CREDS_PATH, 'utf-8'));
}

async function login(page: Page, username: string, pin: string): Promise<void> {
  await page.goto('/');
  await page.getByTestId('login-username').fill(username);
  await page.getByTestId('login-pin').fill(pin);
  await page.getByTestId('login-submit').click();
}

/** Admin provisions one student + class + scope + assignment via UI. */
async function provision(page: Page) {
  const stamp = String(Date.now()).slice(-8);
  const cls = `E2EA-${stamp}`;
  const student = `as${stamp}`;
  const title = `E2E bai ${stamp}`;

  await login(page, adminCreds().username, adminCreds().pin);
  await expect(page.getByTestId('admin-tab-accounts')).toBeVisible();

  await page.getByTestId('account-username').fill(student);
  await page.getByTestId('account-displayname').fill(`HS ${stamp}`);
  await page.getByTestId('account-pin').fill('123456');
  await page.getByTestId('account-create-submit').click();
  await expect(page.getByTestId(`account-row-${student}`)).toBeVisible();

  await page.getByTestId('admin-tab-classes').click();
  await page.getByTestId('class-name').fill(cls);
  await page.getByTestId('class-create-submit').click();
  await expect(page.getByTestId(`class-row-${cls}`)).toBeVisible();

  await page.getByTestId('admin-tab-enroll').click();
  await page.getByTestId('enroll-class-select').selectOption({ label: cls });
  await page.getByTestId(`enroll-toggle-${student}`).click();
  await expect(page.getByTestId(`enroll-toggle-${student}`)).toHaveText('Gỡ khỏi lớp');

  await page.getByTestId('admin-tab-scope').click();
  await page.getByTestId('scope-class-select').selectOption({ label: cls });
  await page.getByTestId('scope-grade-grade-3').click();
  await expect(page.getByTestId('scope-grade-grade-3')).toContainText('Đang mở');

  // Giao bài: title + grade + program + count + deadline
  await page.getByTestId('admin-tab-assign').click();
  await page.getByTestId('assign-class-select').selectOption({ label: cls });
  await page.getByTestId('assign-title').fill(title);
  const due = new Date(Date.now() + 24 * 3600e3);
  const dueStr = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}T23:59`;
  await page.getByTestId('assign-due').fill(dueStr);
  await page.getByTestId('assign-create-submit').click();
  await expect(page.getByTestId('admin-toast')).toBeVisible({ timeout: 15_000 });

  await page.getByTestId('admin-signout').click();
  return { cls, student, title };
}

/** Answer every question then submit - same loop as the arena spec. */
async function sitExam(page: Page): Promise<void> {
  const begin = page.getByTestId('exam-begin');
  if (await begin.isVisible({ timeout: 15_000 }).catch(() => false)) await begin.click();
  for (let i = 0; i < 15; i++) {
    const next = page.getByTestId('exam-next');
    if (await next.isVisible().catch(() => false)) {
      await next.click();
      continue;
    }
    const opt = page.locator('[data-testid^="exam-option-"], [data-testid^="exam-tf-"]').first();
    const textIn = page.getByTestId('exam-text-input');
    if (await opt.isVisible().catch(() => false)) {
      await opt.click();
      if (await next.isVisible().catch(() => false)) await next.click();
    } else if (await textIn.isVisible().catch(() => false)) {
      await textIn.fill('a');
      await page.getByTestId('exam-text-submit').click();
      if (await next.isVisible().catch(() => false)) await next.click();
    } else {
      break;
    }
  }
  const submit = page.getByTestId('exam-submit');
  if (await submit.isVisible().catch(() => false)) await submit.click();
  const ok = page.getByTestId('end-confirm-ok');
  if (await ok.isVisible().catch(() => false)) await ok.click();
}

test.describe('CR-98 class assignment (real backend)', () => {
  test.skip(!configured, 'Supabase env/admin creds absent - env-free mode');

  test('teacher assigns -> student takes -> report shows submission', async ({ browser }) => {
    test.setTimeout(300_000);
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    let student: string;
    let title: string;
    let cls: string;
    try {
      ({ student, title, cls } = await provision(adminPage));
    } finally {
      await adminCtx.close();
    }

    // Student: inbox shows the assignment, take launches the exam.
    const stuCtx = await browser.newContext();
    const stuPage = await stuCtx.newPage();
    try {
      await login(stuPage, student, '123456');
      const inbox = stuPage.getByTestId('assignments-inbox');
      await expect(inbox).toBeVisible({ timeout: 20_000 });
      await expect(inbox).toContainText(title);
      const row = stuPage.locator('[data-testid^="assignment-row-"]', { hasText: title });
      const takeBtn = row.locator('[data-testid^="assignment-take-"]');
      await takeBtn.click();
      await expect(stuPage.getByTestId('exam-screen')).toBeVisible({ timeout: 20_000 });

      // Sit the assignment - fixed form, exam pacing.
      await sitExam(stuPage);
      // Result screen or return home - either way the submit RPC fired.
      await expect(
        stuPage.getByTestId('exam-result').or(stuPage.getByTestId(/grade-card-/).first()),
      ).toBeVisible({ timeout: 30_000 });
    } finally {
      await stuCtx.close();
    }

    // Teacher/admin: report lists the student as submitted with a score.
    const repCtx = await browser.newContext();
    const repPage = await repCtx.newPage();
    try {
      await login(repPage, adminCreds().username, adminCreds().pin);
      await repPage.getByTestId('admin-tab-assign').click();
      await repPage.getByTestId('assign-class-select').selectOption({ label: cls });
      const row = repPage.locator('li', { hasText: title });
      await expect(row).toBeVisible({ timeout: 15_000 });
      await expect(row).toContainText('1/1 nộp');
      await row.locator('[data-testid^="assign-report-"]').click();
      const panel = repPage.locator('[data-testid^="assign-report-panel-"]');
      await expect(panel).toContainText(`HS ${student.slice(2)}`);
      await expect(panel).toContainText('Đã nộp');
    } finally {
      await repCtx.close();
    }
  });
});
