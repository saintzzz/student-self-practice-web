/* Deep-screen sweep: capture every hidden/secondary surface to audit
   against the navy + paper design system (hub expansions, flashcards,
   exam review, game chrome, parent gate/report, credits, dialogs). */
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const shot = (n) => join(tmpdir(), `deep-${n}.png`);
const BASE = process.env.BASE ?? 'http://localhost:5173';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const log = (...a) => console.log('[sweep]', ...a);
const results = [];

async function toHub(grade = 'grade-3') {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const guest = page.locator('[data-testid="guest-button"]').first();
  if (await guest.count()) { await guest.click(); await page.waitForTimeout(2000); }
  const card = page.locator(`[data-testid="grade-card-${grade}"]`).first();
  await card.click();
  await page.waitForTimeout(2000);
}

async function openTile(id) {
  const tile = page.locator(`[data-testid="hub-tile-${id}"]`).first();
  if (await tile.count()) { await tile.click(); await page.waitForTimeout(1600); return true; }
  return false;
}

// 1. Grade map
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2800);
const guest = page.locator('[data-testid="guest-button"]').first();
if (await guest.count()) { await guest.click(); await page.waitForTimeout(2200); }
await page.screenshot({ path: shot('01-grademap'), fullPage: true });
results.push(['grademap', true]);

// 2. Hub collapsed + each tile expanded
await toHub();
await page.screenshot({ path: shot('02-hub'), fullPage: true });
for (const id of ['more', 'games', 'reward']) {
  await toHub();
  const ok = await openTile(id);
  results.push([`hub-tile-${id}`, ok]);
  await page.screenshot({ path: shot(`03-tile-${id}`), fullPage: true });
}

// 3. Flashcards
await toHub();
const fc = page.locator('[data-testid="hub-tile-flashcards"], button:has-text("Flashcard"), [data-testid*="flashcard"]').first();
if (await fc.count()) { await fc.click(); await page.waitForTimeout(1800); results.push(['flashcards', true]); }
else results.push(['flashcards', false]);
await page.screenshot({ path: shot('04-flashcards'), fullPage: true });

// 4. Exam flow: intro -> paper -> review
await toHub();
const prog = page.locator('[data-testid="hub-tile-english"], button:has-text("Tiếng Anh")').first();
if (await prog.count()) { await prog.click(); await page.waitForTimeout(1500); }
const examBtn = page.locator('[data-testid*="exam"], button:has-text("Thi")').first();
if (await examBtn.count()) { await examBtn.click(); await page.waitForTimeout(2000); }
await page.screenshot({ path: shot('05-exam-intro'), fullPage: true });
const startBtn = page.locator('button:has-text("Bắt đầu"), [data-testid="start-exam"]').first();
if (await startBtn.count()) { await startBtn.click().catch(() => {}); await page.waitForTimeout(2500); }
await page.screenshot({ path: shot('06-exam-paper'), fullPage: true });
// answer 2 questions then open review sheet
for (let i = 0; i < 2; i++) {
  const opt = page.locator('[data-testid^="exam-option-"], [data-testid="exam-answer-input"]').first();
  if (await opt.count()) {
    const tag = await opt.getAttribute('data-testid');
    if (tag === 'exam-answer-input') { await opt.fill('a'); }
    else { await opt.click(); }
    await page.waitForTimeout(900);
    const next = page.locator('button:has-text("Tiếp"), button:has-text("Câu tiếp"), [data-testid="exam-next"]').first();
    if (await next.count()) await next.click().catch(() => {});
    await page.waitForTimeout(1200);
  } else break;
}
const nav = page.locator('button:has-text("Tổng quan"), [data-testid="exam-nav-sheet"], [data-testid="exam-review"]').first();
if (await nav.count()) { await nav.click(); await page.waitForTimeout(1400); }
await page.screenshot({ path: shot('07-exam-review'), fullPage: true });

// 5. Game screen + end state
await toHub();
await openTile('games');
const gameCard = page.locator('[data-testid^="game-card-"]').first();
if (await gameCard.count()) {
  await gameCard.click(); await page.waitForTimeout(2500);
  await page.screenshot({ path: shot('08-game'), fullPage: true });
  results.push(['game-screen', true]);
} else results.push(['game-screen', false]);

// 6. Parent gate + report
await toHub();
const parent = page.locator('button:has-text("ba mẹ"), button:has-text("Báo cáo"), [data-testid*="parent"]').first();
if (await parent.count()) { await parent.click(); await page.waitForTimeout(1500); }
await page.screenshot({ path: shot('09-parentgate'), fullPage: true });
// solve gate
const q = await page.locator('[data-testid="gate-question"], [class*="question"]').first().textContent().catch(() => '');
const VI = { 'không':0,'một':1,'hai':2,'ba':3,'bốn':4,'năm':5,'sáu':6,'bảy':7,'tám':8,'chín':9,'mười':10 };
const m = (q ?? '').match(/(\w+)\s*(nhân|x|\*)\s*(\w+)/i);
if (m) {
  const n = (w) => VI[w.toLowerCase()] ?? parseInt(w);
  const ans = n(m[1]) * n(m[3]);
  const inp = page.locator('[data-testid="gate-answer"], input[type="text"], input').first();
  if (await inp.count()) { await inp.fill(String(ans)); await page.keyboard.press('Enter'); await page.waitForTimeout(2000); }
}
await page.screenshot({ path: shot('10-report'), fullPage: true });

// 7. Credits
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const g2 = page.locator('[data-testid="guest-button"]').first();
if (await g2.count()) { await g2.click(); await page.waitForTimeout(2000); }
const credits = page.locator('a:has-text("Nguồn"), button:has-text("Nguồn"), [data-testid*="credits"], a[href*="credits"]').first();
if (await credits.count()) { await credits.click(); await page.waitForTimeout(1800); }
await page.screenshot({ path: shot('11-credits'), fullPage: true });

log('RESULTS:', JSON.stringify(results));
await browser.close();
