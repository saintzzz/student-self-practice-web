/* Sweep 2: corrected selectors - learn subtile -> flashcards/exam,
   game launch, parent gate, batch screen. */
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const shot = (n) => join(tmpdir(), `deep2-${n}.png`);
const BASE = process.env.BASE ?? 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const log = (...a) => console.log('[sweep2]', ...a);

async function toHub(grade = 'grade-3') {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  const guest = page.locator('[data-testid="guest-button"]').first();
  if (await guest.count()) { await guest.click(); await page.waitForTimeout(2000); }
  await page.locator(`[data-testid="grade-card-${grade}"]`).first().click();
  await page.waitForTimeout(2000);
}

// 1. Learn tile -> English program card (G345: programs render directly)
await toHub();
await page.locator('[data-testid="hub-tile-learn"]').first().click();
await page.waitForTimeout(1400);
await page.screenshot({ path: shot('01-learn-open'), fullPage: true });

// 2. Flashcards
const fc = page.locator('[data-testid="flashcards-start"]').first();
if (await fc.count()) { await fc.click(); await page.waitForTimeout(2200); }
await page.screenshot({ path: shot('03-flashcards'), fullPage: true });

// 3. Exam: learn tile -> exam-program-english
await toHub();
await page.locator('[data-testid="hub-tile-learn"]').first().click();
await page.waitForTimeout(1400);
const exam = page.locator('[data-testid="exam-program-english"]').first();
if (await exam.count()) { await exam.click(); await page.waitForTimeout(2600); }
await page.screenshot({ path: shot('04-exam-paper'), fullPage: true });
// nav sheet
const nav = page.locator('[data-testid="exam-nav-open"]').first();
if (await nav.count()) { await nav.click(); await page.waitForTimeout(1400); }
await page.screenshot({ path: shot('05-exam-nav'), fullPage: true });

// 4. Game launch (feed-the-pig always available)
await toHub();
await page.locator('[data-testid="hub-tile-games"]').first().click();
await page.waitForTimeout(1500);
const card = page.locator('[data-testid="game-card-feed-the-pig"]').first();
if (await card.count()) { await card.click(); await page.waitForTimeout(2000); }
const lvl = page.locator('[data-testid^="game-level-"]').first();
if (await lvl.count()) { await lvl.click(); await page.waitForTimeout(2400); }
await page.screenshot({ path: shot('06-game'), fullPage: true });

// 5. Batch screen
await toHub();
const start = page.locator('[data-testid="start-batch-button"]').first();
if (await start.count()) { await start.click(); await page.waitForTimeout(2600); }
await page.screenshot({ path: shot('07-batch'), fullPage: true });

// 6. Parent gate + report (entry on grade select)
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2600);
const g = page.locator('[data-testid="guest-button"]').first();
if (await g.count()) { await g.click(); await page.waitForTimeout(2000); }
const pr = page.locator('[data-testid="open-parent-report"]').first();
if (await pr.count()) { await pr.click(); await page.waitForTimeout(1600); }
await page.screenshot({ path: shot('08-parentgate'), fullPage: true });
// solve via keypad
const q = await page.locator('[data-testid="parent-gate-question"]').first().textContent().catch(() => '');
const VI = { 'không': 0, 'một': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'năm': 5, 'sáu': 6, 'bảy': 7, 'tám': 8, 'chín': 9, 'mười': 10 };
const m = (q ?? '').match(/(\w+)\s*(nhân|x|\*)\s*(\w+)/i);
if (m) {
  const n = (w) => VI[w.toLowerCase()] ?? parseInt(w);
  for (const ch of String(n(m[1]) * n(m[3]))) {
    await page.locator(`[data-testid="parent-gate-key-${ch}"]`).first().click();
  }
  await page.locator('[data-testid="parent-gate-ok"]').first().click();
  await page.waitForTimeout(2400);
}
await page.screenshot({ path: shot('09-report'), fullPage: true });
log('DONE');
await browser.close();
