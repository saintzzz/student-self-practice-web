import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * CR-97 end-to-end: two real students run a live Arena race.
 *
 * Provisioning follows the auth.spec.ts convention - one admin context
 * creates two student accounts, enrolls them in a class and scopes the
 * grade, then two fresh contexts host/join the room: presence roster,
 * host-only start, same seeded question set, progress broadcast, and a
 * settled podium on both screens.
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

/** Admin provisions two students + one class + grade scope, all via UI. */
async function provisionPlayers(page: Page) {
  const stamp = String(Date.now()).slice(-8);
  const cls = `E2EL-${stamp}`;
  const students = [`lv${stamp}a`, `lv${stamp}b`];

  await login(page, adminCreds().username, adminCreds().pin);
  await expect(page.getByTestId('admin-tab-accounts')).toBeVisible();

  for (const [i, username] of students.entries()) {
    await page.getByTestId('account-username').fill(username);
    await page.getByTestId('account-displayname').fill(`Live ${stamp} ${i}`);
    await page.getByTestId('account-pin').fill('123456');
    await page.getByTestId('account-create-submit').click();
    await expect(page.getByTestId(`account-row-${username}`)).toBeVisible();
  }

  await page.getByTestId('admin-tab-classes').click();
  await page.getByTestId('class-name').fill(cls);
  await page.getByTestId('class-create-submit').click();
  await expect(page.getByTestId(`class-row-${cls}`)).toBeVisible();

  await page.getByTestId('admin-tab-enroll').click();
  await page.getByTestId('enroll-class-select').selectOption({ label: cls });
  for (const username of students) {
    await page.getByTestId(`enroll-toggle-${username}`).click();
    await expect(page.getByTestId(`enroll-toggle-${username}`)).toHaveText('Gỡ khỏi lớp');
  }

  await page.getByTestId('admin-tab-scope').click();
  await page.getByTestId('scope-class-select').selectOption({ label: cls });
  await page.getByTestId('scope-grade-grade-3').click();
  await expect(page.getByTestId('scope-grade-grade-3')).toContainText('Đang mở');

  await page.getByTestId('admin-signout').click();
  return { cls, students };
}

async function playerToHub(ctx: Page, username: string): Promise<void> {
  await login(ctx, username, '123456');
  await page_waitForGrades(ctx);
  await ctx.getByTestId('grade-card-grade-3').click();
  await expect(ctx.getByTestId('arena-card')).toBeVisible({ timeout: 15_000 });
}
async function page_waitForGrades(page: Page): Promise<void> {
  await expect(page.getByTestId(/grade-card-/).first()).toBeVisible({ timeout: 15_000 });
}

/** Click through every question of the seeded arena run, then submit. */
async function raceToFinish(page: Page): Promise<void> {
  const begin = page.getByTestId('exam-begin');
  if (await begin.isVisible({ timeout: 5_000 }).catch(() => false)) await begin.click();
  for (let i = 0; i < 15; i++) {
    const opt = page.locator('[data-testid^="exam-option-"], [data-testid^="exam-tf-"]').first();
    const textIn = page.getByTestId('exam-text-input');
    if (await opt.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await opt.click();
    } else if (await textIn.isVisible({ timeout: 1_000 }).catch(() => false)) {
      await textIn.fill('a');
      await page.getByTestId('exam-text-submit').click();
    } else {
      break;
    }
    const next = page.getByTestId('exam-next');
    if (await next.isVisible({ timeout: 1_500 }).catch(() => false)) await next.click();
  }
  const submit = page.getByTestId('exam-submit');
  if (await submit.isVisible().catch(() => false)) await submit.click();
  const ok = page.getByTestId('end-confirm-ok');
  if (await ok.isVisible({ timeout: 3_000 }).catch(() => false)) await ok.click();
}

test.describe('CR-97 live Arena race (real backend, 2 players)', () => {
  test.skip(!configured, 'Supabase env/admin creds absent - env-free mode');

  test('host creates, joiner joins by code, race settles to a podium', async ({ browser }) => {
    test.setTimeout(240_000);
    const adminCtx = await browser.newContext();
    const adminPage = await adminCtx.newPage();
    let students: string[];
    try {
      ({ students } = await provisionPlayers(adminPage));
    } finally {
      await adminCtx.close();
    }

    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    try {
      await playerToHub(pageA, students[0]);
      await playerToHub(pageB, students[1]);

      // Host creates the room -> 6-char code.
      await pageA.getByTestId('arena-live-open').click();
      await pageA.getByTestId('arena-live-create').click();
      await expect(pageA.getByTestId('arena-live-code')).toBeVisible({ timeout: 15_000 });
      const code = (await pageA.getByTestId('arena-live-code').textContent())!.trim();
      expect(code).toMatch(/^[A-Z0-9]{6}$/);

      // Joiner joins by code; host roster grows to 2 via presence.
      await pageB.getByTestId('arena-live-open').click();
      await pageB.getByTestId('arena-live-code-input').fill(code);
      await pageB.getByTestId('arena-live-join').click();
      await expect(pageB.getByTestId('arena-live-waiting')).toBeVisible({ timeout: 15_000 });
      await expect(pageA.getByTestId('arena-live-roster').locator('li')).toHaveCount(2, { timeout: 15_000 });

      // Host-only start -> both screens enter the same seeded run.
      await pageA.getByTestId('arena-live-start').click();
      await expect(pageA.getByTestId('exam-screen')).toBeVisible({ timeout: 20_000 });
      await expect(pageB.getByTestId('exam-screen')).toBeVisible({ timeout: 20_000 });

      // Same seed -> identical first options on both desks.
      const beginA = pageA.getByTestId('exam-begin');
      const beginB = pageB.getByTestId('exam-begin');
      if (await beginA.isVisible({ timeout: 8_000 }).catch(() => false)) await beginA.click();
      if (await beginB.isVisible({ timeout: 8_000 }).catch(() => false)) await beginB.click();
      const optA = pageA.locator('[data-testid^="exam-option-"], [data-testid^="exam-tf-"]').first();
      const optB = pageB.locator('[data-testid^="exam-option-"], [data-testid^="exam-tf-"]').first();
      await expect(optA).toBeVisible({ timeout: 15_000 });
      await expect(optB).toBeVisible({ timeout: 15_000 });
      expect(await optA.textContent()).toBe(await optB.textContent());

      // B answers -> A's standings strip reflects live progress.
      await optB.click();
      await expect(pageA.getByTestId('arena-live-standings')).toBeVisible({ timeout: 15_000 });

      // Race both to the podium; order must agree on both screens.
      await Promise.all([raceToFinish(pageA), raceToFinish(pageB)]);
      await expect(pageA.getByTestId('arena-live-podium')).toBeVisible({ timeout: 90_000 });
      await expect(pageB.getByTestId('arena-live-podium')).toBeVisible({ timeout: 90_000 });
      await expect(pageA.getByTestId('live-podium-0')).toBeVisible({ timeout: 90_000 });
      const winnerA = await pageA.getByTestId('live-podium-0').textContent();
      const winnerB = await pageB.getByTestId('live-podium-0').textContent();
      expect(winnerA).toBe(winnerB);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});
