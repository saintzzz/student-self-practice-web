import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const shot = (name) => join(tmpdir(), name);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const BASE = process.env.BASE ?? 'http://localhost:5173';

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const guest = page.locator('[data-testid="guest-button"]').first();
if (await guest.count()) { await guest.click(); await page.waitForTimeout(2500); }

// grade-2 (G12 band - flashcards live in "Luyen them" > "Tieng Anh")
await page.locator('[data-testid="grade-card-grade-2"]').first().click();
await page.waitForTimeout(2500);
const more = page.locator('[data-testid="hub-tile-more"]');
if (await more.count()) { await more.click(); await page.waitForTimeout(800); }
const eng = page.locator('[data-testid="hub-subtile-english"]');
if (await eng.count()) { await eng.click(); await page.waitForTimeout(800); }
await page.locator('[data-testid="flashcards-start"]').click();
await page.waitForTimeout(2500);

console.log('card:', await page.locator('[data-testid="flashcard-card"]').count());
console.log('counter:', await page.locator('[data-testid="flashcard-counter"]').textContent());
await page.screenshot({ path: shot('cr89-card1.png') });

let failures = 0;
const check = (ok, tag, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${tag}${detail ? ' - ' + detail : ''}`);
  if (!ok) failures += 1;
};

const checkNoPan = async (tag) => {
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  const iw = await page.evaluate(() => window.innerWidth);
  const sx = await page.evaluate(() => window.scrollX);
  check(sw <= iw, `${tag}: no horizontal document overflow`, `scrollWidth=${sw} innerWidth=${iw}`);
  check(sx === 0, `${tag}: viewport not panned`, `scrollX=${sx}`);
};

// Rate three cards via the KNOWN button (right fly-out = worst pan case)
for (let i = 0; i < 3; i++) {
  await page.locator('[data-testid="flashcard-known"]').click();
  await page.waitForTimeout(200); // mid-exit
  await checkNoPan(`mid-exit-${i}`);
  await page.waitForTimeout(600); // new card mounted
  await checkNoPan(`next-card-${i}`);
  const box = await page.locator('[data-testid="flashcard-card"]').boundingBox();
  check(!!box && box.x >= -5 && box.x + box.width <= 400, `next-card-${i}: card in viewport`, `x=${box?.x}`);
  console.log('counter now:', await page.locator('[data-testid="flashcard-counter"]').textContent());
}
await page.screenshot({ path: shot('cr89-card4.png') });

// Buttons visible + solid (no translucent glass on the scenery)
const again = page.locator('[data-testid="flashcard-again"]');
const known = page.locator('[data-testid="flashcard-known"]');
for (const [name, el] of [['again', again], ['known', known]]) {
  const img = await el.evaluate((n) => getComputedStyle(n).backgroundImage);
  check(await el.isVisible(), `${name} button visible`);
  check(img.includes('gradient'), `${name} button is solid`, img.slice(0, 60));
}

await browser.close();
if (failures) { console.log(`FAILED: ${failures} check(s)`); process.exit(1); }
console.log('DONE - all checks passed');
