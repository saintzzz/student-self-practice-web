// Captures real product screenshots of ea.vieschool.com for English Arena
// marketing videos (tokvideo pipeline). Output: ../tokvideo/public/images/english-arena/
// Usage: node scripts/capture-ea-shots.mjs
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.EA_BASE_URL ?? 'https://ea.vieschool.com';
const OUT = path.resolve(import.meta.dirname, '../../tokvideo/public/images/english-arena');
const USER = process.env.EA_USER ?? 'demo_hs';
const PIN = process.env.EA_PIN ?? 'demo2026';
const ADMIN = process.env.EA_ADMIN_USER ?? 'demo_admin';

await mkdir(OUT, { recursive: true });

// Local playwright browser registry is version-mismatched — point at an
// existing chromium build instead of downloading the matching one.
const EXE = process.env.PW_CHROME ?? 'C:\\Users\\linhl\\AppData\\Local\\ms-playwright\\chromium-1243\\chrome-win64\\chrome.exe';
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 2,
});

const shot = async (name) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log('shot:', name);
};

const gotoRetry = async (url = BASE) => {
  for (let i = 0; i < 4; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3500);
      return;
    } catch (e) {
      console.warn(`goto retry ${i + 1}: ${String(e).slice(0, 100)}`);
      await page.waitForTimeout(4000);
    }
  }
  throw new Error(`cannot load ${url}`);
};

const tryClick = async (sel, timeout = 20000) => {
  try {
    const el = page.locator(sel).first();
    await el.waitFor({ state: 'visible', timeout });
    await el.click();
    return true;
  } catch (e) {
    console.warn(`click fail ${sel}: ${String(e).slice(0, 100)}`);
    return false;
  }
};

const go = async (sel, name, { timeout = 20000 } = {}) => {
  try {
    const el = page.locator(sel).first();
    await el.waitFor({ state: 'visible', timeout });
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await shot(name);
    return true;
  } catch (e) {
    console.warn(`SKIP ${name}: ${sel}`);
    return false;
  }
};

// EA_ADMIN_ONLY=1 skips the student/guest flow (e.g. re-running just to
// pick up newly added admin shots).
const ADMIN_ONLY = process.env.EA_ADMIN_ONLY === '1';

await gotoRetry();

if (!ADMIN_ONLY) {
// ── Login screen itself (username + PIN, no email) ─────────────
await go('[data-testid="login-submit"]', 'login');

// ── Guest flow ─────────────────────────────────────────────────
await tryClick('[data-testid="guest-button"]');
await page.waitForTimeout(2500);
await shot('home');
await tryClick('[data-testid="grade-card-grade-4"]');
await page.waitForTimeout(1500);
await shot('guest-start');
await tryClick('[data-testid="start-batch-button"]');
await page.waitForTimeout(3500);
await shot('game-1');
for (const sel of ['[data-testid^="exam-option-"]', '[data-testid^="exam-letter-"]']) {
  try {
    const el = page.locator(sel).first();
    if (await el.isVisible({ timeout: 2000 })) { await el.click(); break; }
  } catch {}
}
await page.waitForTimeout(1200);
await shot('game-2');

// ── Login (username + PIN) ─────────────────────────────────────
await gotoRetry();
await page.fill('[data-testid="login-username"]', USER);
await page.fill('[data-testid="login-pin"]', PIN);
await shot('login-filled');
await tryClick('[data-testid="login-submit"]');
// Supabase auth can be slow — wait for the grade cards to appear.
try {
  await page.locator('[data-testid="grade-card-grade-4"]').waitFor({ state: 'visible', timeout: 60000 });
} catch {
  console.warn('login did not reach grade select in 60s');
}
await page.waitForTimeout(1500);
await shot('after-login');

// ── Grade map / engagement cards (logged in) ───────────────────
await tryClick('[data-testid="grade-card-grade-4"]');
await page.waitForTimeout(4000);
await shot('map-top');
for (const [sel, name] of [
  ['[data-testid="daily-quest-card"]', 'quests'],
  ['[data-testid="pet-card"]', 'pet'],
  ['[data-testid="leaderboard-card"]', 'leaderboard'],
  ['[data-testid="arena-card"]', 'arena'],
  ['[data-testid="review-card"]', 'review'],
  ['[data-testid="coach-card"]', 'coach'],
]) {
  await go(sel, name);
}

// ── Thi thử (exam) ─────────────────────────────────────────────
await go('[data-testid="exam-program-english"]', 'exam-cta');
await tryClick('[data-testid="exam-program-english"]');
await page.waitForTimeout(3000);
await shot('exam-intro');
await tryClick('[data-testid="exam-begin"]');
await page.waitForTimeout(3500);
await shot('exam-mid');
for (const nav of ['exam-nav-5', 'exam-nav-12']) {
  await page.locator(`[data-testid="${nav}"]`).first().click().catch(() => {});
  await page.waitForTimeout(600);
}
await shot('exam-mid-2');

// ── Parent report — reload keeps the session; if logged out, log in again ──
await gotoRetry();
const reportBtn = page.locator('[data-testid="open-parent-report"]');
if (!(await reportBtn.isVisible({ timeout: 10000 }).catch(() => false))) {
  await page.fill('[data-testid="login-username"]', USER);
  await page.fill('[data-testid="login-pin"]', PIN);
  await tryClick('[data-testid="login-submit"]');
  await page.waitForTimeout(8000);
}
await tryClick('[data-testid="open-parent-report"]', 30000);
await page.waitForTimeout(4000);
await shot('report');
await page.evaluate(() => window.scrollBy(0, 700));
await page.waitForTimeout(800);
await shot('report-2');
}

// ── Admin/teacher dashboard (demo_admin) — clear the student session
// first so the login screen shows again ──
await page.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
});
await gotoRetry();
await page.fill('[data-testid="login-username"]', ADMIN);
await page.fill('[data-testid="login-pin"]', PIN);
await tryClick('[data-testid="login-submit"]');
try {
  await page.locator('[data-testid="admin-tab-accounts"]').waitFor({ state: 'visible', timeout: 60000 });
} catch {
  console.warn('admin screen did not appear in 60s');
}
await page.waitForTimeout(3000);
await shot('admin-accounts');
await tryClick('[data-testid="admin-tab-progress"]');
await page.waitForTimeout(4500);
await shot('admin-progress');
await tryClick('[data-testid="admin-tab-classes"]');
await page.waitForTimeout(2500);
await shot('admin-classes');

await browser.close();
console.log('Done ->', OUT);
