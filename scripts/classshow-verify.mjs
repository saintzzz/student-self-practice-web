// CR-142 verify: Sân khấu lớp must fit a projector viewport.
// Usage: node scripts/classshow-verify.mjs [viewportW] [viewportH]
import { chromium } from 'playwright';

const W = Number(process.argv[2] ?? 1440);
const H = Number(process.argv[3] ?? 900);
const ROSTER_30 = Array.from({ length: 30 }, (_, i) => `Học Sinh ${String(i + 1).padStart(2, '0')}`).join(', ');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
const shot = (n) => page.screenshot({ path: `_shots/classshow-fix/${n}.png`, fullPage: false });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.getByTestId('guest-button').click();
await page.getByTestId('grade-card-grade-3').click();
await page.getByTestId('hub-tile-arena').click();
await page.getByTestId('class-show-open').click();
await page.locator('[data-testid="show-roster"]').fill(ROSTER_30);
await page.getByTestId('show-start').click();
await page.waitForSelector('[data-testid="show-question"]', { timeout: 30000 });
await shot('q-question');

const q = await page.evaluate(() => {
  const doc = document.documentElement;
  const sb = [...document.querySelectorAll('[data-testid^="show-player-"]')].at(0)?.parentElement;
  const controls = [...document.querySelectorAll('button')].find((b) => b.dataset.testid === 'show-reveal-btn' || b.dataset.testid === 'show-skip');
  return {
    docHeight: doc.scrollHeight, viewportH: innerHeight,
    scoreboardScrollH: sb?.scrollHeight, scoreboardClientH: sb?.clientHeight,
    playerCount: document.querySelectorAll('[data-testid^="show-player-"]').length,
    controlsVisible: controls ? controls.getBoundingClientRect().bottom <= innerHeight : null,
  };
});
console.log('QUESTION', JSON.stringify(q));

await page.getByTestId('show-reveal-btn').click();
await page.waitForSelector('[data-testid="show-correct"]');
await shot('q-revealed');
const r = await page.evaluate(() => ({
  docHeight: document.documentElement.scrollHeight,
  correctVisible: document.querySelector('[data-testid="show-correct"]').getBoundingClientRect().bottom <= innerHeight,
}));
console.log('REVEALED', JSON.stringify(r));

// wrong-answer steal flow: spotlight again then question
await page.getByTestId('show-wrong').click();
await page.waitForSelector('[data-testid="show-question"]', { timeout: 30000 });
console.log('STEAL ok -> back to question phase');
await shot('q-steal');

await browser.close();
console.log('DONE');
