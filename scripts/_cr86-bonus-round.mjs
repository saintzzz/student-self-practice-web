/* CR-86 verify: drive a real batch to the seeded bonus game Round,
   play it through, and land on the batch summary. */
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const shot = (n) => join(tmpdir(), n);
const BASE = process.env.BASE ?? 'http://localhost:5199';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const log = (...a) => console.log('[cr86]', ...a);

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const guest = page.locator('[data-testid="guest-button"]').first();
if (await guest.count()) { await guest.click(); await page.waitForTimeout(2500); }
await page.locator('[data-testid="grade-card-grade-3"]').first().click();
await page.waitForTimeout(2000);
const choi = page.locator('[data-testid="cta-play"], button:has-text("Chơi")').first();
if (await choi.count()) { await choi.click(); await page.waitForTimeout(2500); }

async function answerQuestion() {
  // Pronunciation: headless Chromium has no SpeechRecognition -> skip
  const skip = page.locator('[data-testid="pronunciation-skip-button"]');
  if (await skip.count()) { await skip.click({ timeout: 2000 }).catch(() => {}); return 'pron-skip'; }
  // Option-shaped kinds (option-0 may be wrong - fine, still advances)
  const opt = page.locator('[data-testid^="option-"]:not([disabled])').first();
  if (await opt.count()) { await opt.click({ timeout: 2000 }).catch(() => {}); return 'opt'; }
  // Extra-letter: single tap on any letter tile answers immediately
  const letter = page.locator('[data-testid^="letter-tile-"]:not([disabled])').first();
  if (await letter.count()) { await letter.click({ timeout: 2000 }).catch(() => {}); return 'letter'; }
  const tile = page.locator('[data-testid^="spell-tile-"]').first();
  if (await tile.count()) {
    for (let i = 0; i < 12; i++) {
      const t = page.locator('[data-testid^="spell-tile-"]').first();
      if (!(await t.count())) break;
      await t.click({ timeout: 1500 }).catch(() => {});
      const sub = page.locator('[data-testid="submit-answer-button"]');
      if (await sub.isEnabled().catch(() => false)) break;
    }
    const sub = page.locator('[data-testid="submit-answer-button"]');
    if (await sub.isEnabled().catch(() => false)) { await sub.click(); return 'spell'; }
  }
  const input = page.locator('[data-testid="answer-input"]');
  if (await input.count()) { await input.fill('x'); const s = page.locator('[data-testid="submit-answer-button"]'); await s.click(); return 'typed'; }
  const rec = page.locator('[data-testid="record-button"]');
  if (await rec.count()) {
    await rec.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(3500);
    const recStop = page.locator('[data-testid="record-button"]');
    if (await recStop.count()) await recStop.click({ timeout: 1500 }).catch(() => {});
    return 'rec';
  }
  const auto = page.locator('[data-testid="tracing-auto-step"]');
  if (await auto.count()) { for (let i = 0; i < 8; i++) { const a = page.locator('[data-testid="tracing-auto-step"]'); if (!(await a.count())) break; await a.click({ timeout: 1500 }).catch(() => {}); } return 'trace'; }
  const pair = page.locator('[data-testid^="pair-tile-"]').first();
  if (await pair.count()) {
    // Board resolves on all-pairs-found OR mistake budget exceeded - just
    // click the first two free tiles each sweep until it resolves.
    for (let i = 0; i < 40; i++) {
      const free = page.locator('[data-testid^="pair-tile-"]:not([disabled])');
      const n = await free.count();
      if (n === 0) break;
      await free.nth(0).click({ timeout: 1200 }).catch(() => {});
      await page.waitForTimeout(250);
      const free2 = page.locator('[data-testid^="pair-tile-"]:not([disabled])');
      if (await free2.count() >= 2) {
        await free2.nth(1).click({ timeout: 1200 }).catch(() => {});
      }
      await page.waitForTimeout(400);
      if (!(await page.locator('[data-testid^="pair-tile-"]:not([disabled])').count())) break;
      if (!(await page.locator('[data-testid="pair-matching-mistake-count"]').count())) break;
    }
    return 'pair';
  }
  return 'none';
}

let gameRoundSeen = false;
let sawSummary = false;
let stalled = false;
let lastSig = '';
let stall = 0;
for (let step = 0; step < 160; step++) {
  // stall detection: same visible surface for 12 iterations -> dump + bail
  const ids = await page.locator('[data-testid]').evaluateAll(els =>
    els.filter(e => e.offsetParent !== null)
       .map(e => e.getAttribute('data-testid') + ':' + (e.textContent || '').slice(0, 24))
       .slice(0, 14).join('|')
  ).catch(() => '');
  if (ids === lastSig) { stall++; } else { stall = 0; lastSig = ids; }
  if (stall === 12) {
    stalled = true;
    log('STALLED. visible testids:', ids);
    await page.screenshot({ path: shot('cr86-stall.png'), fullPage: true });
    break;
  }
  if (await page.locator('[data-testid="batch-score-summary"]').count()) { sawSummary = true; log('batch summary'); break; }

  // Bonus game Round surface
  if (await page.locator('[data-testid="game-section-banner"]').count()) {
    if (!gameRoundSeen) {
      gameRoundSeen = true;
      const title = await page.locator('[data-testid="round-progress"]').textContent();
      log('game round reached:', title?.trim());
      await page.screenshot({ path: shot('cr86-1-game-round.png'), fullPage: true });
    }
    const correct = page.locator('[data-correct="true"]:not([disabled])').first();
    if (await correct.count()) {
      // Options animate (game-drift/bob) - Playwright stability checks never
      // settle on a drifting fish, so dispatch a real DOM click instead.
      await correct.evaluate((el) => el.click()).catch(() => {});
    }
    await page.waitForTimeout(900);
    continue;
  }

  if (await page.locator('[data-testid="round-score-summary"]').count()) {
    const next = page.locator('[data-testid="next-round-button"]');
    if (await next.count()) { await next.click(); await page.waitForTimeout(2200); continue; }
  }

  if (await page.locator('[data-testid="question-card"]').count()) {
    const kind = await answerQuestion();
    const next = page.locator('[data-testid="next-button"]');
    await page.waitForTimeout(600);
    if (await next.count() && await next.isEnabled().catch(() => false)) { await next.click(); }
    else { const f = page.locator('[data-testid="feedback-next-button"], [data-testid="next-button"]:not([disabled])').first(); if (await f.count()) await f.click({ timeout: 1500 }).catch(() => {}); }
    await page.waitForTimeout(900);
    continue;
  }
  await page.waitForTimeout(800);
}

await page.screenshot({ path: shot('cr86-2-batch-summary.png'), fullPage: true });
const progress = await page.locator('[data-testid="round-progress"]').textContent().catch(() => 'n/a');
log('final progress:', progress, '| game round seen:', gameRoundSeen, '| summary:', sawSummary, '| stalled:', stalled);
const pass = gameRoundSeen && sawSummary && !stalled;
log(pass ? 'PASS' : 'FAIL');
await browser.close();
process.exit(pass ? 0 : 1);
