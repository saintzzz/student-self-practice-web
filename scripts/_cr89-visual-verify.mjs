import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const shot = (n) => join(tmpdir(), n);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const BASE = process.env.BASE ?? 'http://localhost:4174';
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ' - ' + extra : ''}`);
  if (!ok) failures++;
};

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const guest = page.locator('[data-testid="guest-button"]').first();
if (await guest.count()) { await guest.click(); await page.waitForTimeout(2500); }
await page.locator('[data-testid="grade-card-grade-3"]').first().click();
await page.waitForTimeout(2500);
await page.locator('[data-testid="hub-tile-games"]').first().click();
await page.waitForTimeout(1500);

// Shelf: EmojiVisual renders (svg/img mode) on cards + hero
const shelfVis = await page.locator('[data-testid="game-zone-shelf"] [data-emoji-visual]').count();
check('shelf EmojiVisual count', shelfVis >= 30, `got ${shelfVis}`);
const heroLottie = await page.locator('[data-emoji-visual][data-emoji-mode="lottie"], [data-emoji-visual] [data-emoji-mode="lottie"]').count();
await page.screenshot({ path: shot('cr89-shelf.png'), fullPage: true });

// Balloon Pop -> level picker -> Man 1 -> options render EmojiVisual
await page.locator('[data-testid="game-card-balloon-pop"]').click();
await page.waitForTimeout(2000);
await page.locator('[data-testid="game-level-1"]').click();
await page.waitForTimeout(2500);
const optVis = await page.locator('[data-testid="game-balloon-pop"] [data-emoji-visual]').count();
check('balloon EmojiVisual options', optVis >= 4, `got ${optVis}`);
const svgImgs = await page.locator('[data-testid="game-balloon-pop"] [data-emoji-visual] img').count();
check('balloon svg/img rendered', svgImgs >= 4, `got ${svgImgs}`);
await page.screenshot({ path: shot('cr89-balloon.png') });
// lottie cap: at most 2 players on a game screen
const lottieCount = await page.locator('[data-emoji-mode="lottie"]').count();
check('lottie budget <=2', lottieCount <= 2, `got ${lottieCount}`);

// WhackMole: moles render EmojiVisual; prompt visual is the animated hero
await page.locator('[data-testid="game-exit"]').click();
await page.waitForTimeout(1200);
await page.locator('[data-testid="hub-tile-games"]').first().click();
await page.waitForTimeout(800);
await page.locator('[data-testid="game-card-whack-a-mole"]').click();
await page.waitForTimeout(1500);
await page.locator('[data-testid="game-level-1"]').click();
await page.waitForTimeout(2500);
const moleVis = await page.locator('[data-testid="game-whack-a-mole"] [data-emoji-visual]').count();
check('mole EmojiVisual options', moleVis >= 4, `got ${moleVis}`);
const moleLottie = await page.locator('[data-emoji-mode="lottie"]').count();
check('mole lottie budget <=2', moleLottie <= 2, `got ${moleLottie}`);
await page.screenshot({ path: shot('cr89-mole.png') });

// FeedThePig hero renders through the visual pipeline (svg or lottie,
// never the raw native font) and stays within the lottie budget.
await page.locator('[data-testid="game-exit"]').click();
await page.waitForTimeout(1200);
await page.locator('[data-testid="hub-tile-games"]').first().click();
await page.waitForTimeout(800);
await page.locator('[data-testid="game-card-feed-the-pig"]').click();
await page.waitForTimeout(1500);
await page.locator('[data-testid="game-level-1"]').click();
await page.waitForTimeout(3000);
const pigVis = await page.locator('[data-testid="pig-face"] [data-emoji-visual]').count();
check('pig EmojiVisual', pigVis >= 1, `got ${pigVis}`);
const pigMode = await page.locator('[data-testid="pig-face"] [data-emoji-visual]').getAttribute('data-emoji-mode');
check('pig rendered via pipeline (svg or lottie)', pigMode === 'svg' || pigMode === 'lottie', `mode=${pigMode}`);
const pigLottie = await page.locator('[data-emoji-mode="lottie"]').count();
check('pig lottie budget <=2', pigLottie <= 2, `got ${pigLottie}`);
await page.screenshot({ path: shot('cr89-pig.png') });

console.log(failures === 0 ? 'DONE - all checks passed' : `FAILED ${failures} checks`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
