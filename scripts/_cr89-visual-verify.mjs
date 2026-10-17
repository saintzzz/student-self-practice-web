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
// images must have actually loaded, not just mounted (r46)
const loadedImgs = await page.locator('[data-testid="game-balloon-pop"] [data-emoji-visual] img').evaluateAll(
  (imgs) => imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
);
check('balloon svgs actually loaded', loadedImgs >= 4, `${loadedImgs}/${svgImgs} loaded`);
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

// GoldQuest: the 💎 tally has a vendored lottie asset, so it must enter
// lottie mode deterministically - proves the animated path works end to
// end (player chunk loads, wasm boots, clip plays).
await page.locator('[data-testid="game-exit"]').click();
await page.waitForTimeout(1200);
await page.locator('[data-testid="hub-tile-games"]').first().click();
await page.waitForTimeout(800);
await page.locator('[data-testid="game-card-gold-quest"]').click();
await page.waitForTimeout(1500);
await page.locator('[data-testid="game-level-1"]').click();
await page.waitForTimeout(4000);
const gemLottie = await page.locator('[data-testid="gem-tally"] [data-emoji-mode="lottie"]').count();
check('gem tally animates via lottie', gemLottie >= 1, `got ${gemLottie}`);
// the clip must have rendered its first frame, not just entered lottie
// mode - EmojiVisual sets data-emoji-ready once onReady fires (r46)
await page.locator('[data-testid="gem-tally"] [data-emoji-ready="true"]').waitFor({ timeout: 10000 }).catch(() => {});
const gemReady = await page.locator('[data-testid="gem-tally"] [data-emoji-mode="lottie"][data-emoji-ready="true"]').count();
check('gem lottie actually playing', gemReady >= 1, `ready=${gemReady}`);
// readiness is not playback - the rendered frames must advance (r47).
// The dotlottie player draws into a same-origin canvas; two snapshots
// a beat apart must differ if the animation is really running.
const frameSnap = () => page.locator('[data-testid="gem-tally"] canvas').evaluate((c) => c.toDataURL());
const f1 = await frameSnap();
await page.waitForTimeout(700);
const f2 = await frameSnap();
check('gem lottie frames advance', f1.length > 100 && f1 !== f2, `frames ${f1.length}b, equal=${f1 === f2}`);
const goldLottie = await page.locator('[data-emoji-mode="lottie"]').count();
check('gold lottie budget <=2', goldLottie <= 2, `got ${goldLottie}`);
await page.screenshot({ path: shot('cr89-gold.png') });

console.log(failures === 0 ? 'DONE - all checks passed' : `FAILED ${failures} checks`);
await browser.close();
process.exit(failures === 0 ? 0 : 1);
