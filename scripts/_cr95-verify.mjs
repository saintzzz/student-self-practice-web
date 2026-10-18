import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL || 'http://localhost:5199';
const EXPECTED = [
  'memory-match.webp', 'balloon-pop.webp', 'racing-cars.webp', 'fishing-catch.webp',
  'letter-catch.webp', 'tic-tac-toe.webp', 'whack-a-mole.webp', 'feed-the-pig.webp',
  'picture-reveal.webp', 'treasure-chest.webp', 'gold-quest.webp', 'quiz-show.webp',
  'maze-chase.webp', 'word-worm.webp', 'castle-guard.webp',
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
const resp = await page.goto(base, { waitUntil: 'networkidle' });
if (!resp || !resp.ok()) { console.error('nav failed'); process.exit(1); }

// Pick grade 5 so quiz-show (grade-3..5 gated) appears
const g5 = page.locator('button:has-text("Lớp 5")').first();
if (!(await g5.count())) { console.error('grade-5 card not found'); process.exit(1); }
await g5.click();
await page.waitForTimeout(1500);

// Open Game Zone shelf
const zone = page.locator('button:has-text("Khu trò chơi")').first();
if (!(await zone.count())) { console.error('game-zone tile not found'); process.exit(1); }
await zone.click();
await page.waitForTimeout(2000);

const imgs = await page.locator('img[src*="/images/games/"]').evaluateAll(els =>
  els.map(el => ({ src: el.getAttribute('src').split('/').pop(), ok: el.complete && el.naturalWidth > 0 })));
console.log('art images:', JSON.stringify(imgs));

const seen = new Set(imgs.filter(i => i.ok).map(i => i.src));
const missing = EXPECTED.filter(f => !seen.has(f));
const broken = imgs.filter(i => !i.ok).map(i => i.src);
if (missing.length || broken.length) {
  console.error('FAIL missing:', missing, 'broken:', broken);
  process.exit(1);
}

await page.locator('img[src*="/images/games/"]').first().scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: '_cr95-shelf.png' });
await browser.close();
console.log('PASS: all 15 game art images loaded');
