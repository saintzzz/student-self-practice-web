import { chromium } from 'playwright';

const base = process.env.E2E_BASE_URL || 'http://localhost:5199';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
await page.goto(base, { waitUntil: 'networkidle' });

// Pick grade 5 so quiz-show (grade-3..5 gated) appears
const g5 = page.locator('button:has-text("Lớp 5"), [role=button]:has-text("Lớp 5")').first();
if (await g5.count()) { await g5.click().catch(() => {}); await page.waitForTimeout(1500); }

// Open Game Zone shelf
const zone = page.locator('button:has-text("Khu trò chơi"), [data-testid*="game-zone"]').first();
if (await zone.count()) { await zone.click().catch(() => {}); }
await page.waitForTimeout(2000);

// Scroll the shelf/game list into view and count art imgs
const imgs = await page.locator('img[src*="/images/games/"]').evaluateAll(els =>
  els.map(el => ({ src: el.getAttribute('src').split('/').pop(), ok: el.complete && el.naturalWidth > 0 })));
console.log('art images:', JSON.stringify(imgs));

await page.locator('img[src*="/images/games/"]').first().scrollIntoViewIfNeeded().catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: '_cr95-shelf.png' });
await browser.close();
console.log('done');
