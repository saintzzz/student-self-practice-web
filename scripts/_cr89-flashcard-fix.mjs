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

const checkNoPan = async (tag) => {
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  const iw = await page.evaluate(() => window.innerWidth);
  const sx = await page.evaluate(() => window.scrollX);
  const box = await page.locator('[data-testid="flashcard-card"]').boundingBox();
  console.log(`${tag}: scrollWidth=${sw} innerWidth=${iw} scrollX=${sx} cardLeft=${box?.x} cardRight=${box ? box.x + box.width : null}`);
  const visible = box && box.x >= -5 && box.x + box.width <= iw + 5;
  console.log(`${tag}: card fully in viewport = ${visible}`);
};

// Rate three cards via the KNOWN button (right fly-out = worst pan case)
for (let i = 0; i < 3; i++) {
  await page.locator('[data-testid="flashcard-known"]').click();
  await page.waitForTimeout(200); // mid-exit
  await checkNoPan(`mid-exit-${i}`);
  await page.waitForTimeout(600); // new card mounted
  await checkNoPan(`next-card-${i}`);
  console.log('counter now:', await page.locator('[data-testid="flashcard-counter"]').textContent());
}
await page.screenshot({ path: shot('cr89-card4.png') });

// Buttons visible + solid
const again = page.locator('[data-testid="flashcard-again"]');
const known = page.locator('[data-testid="flashcard-known"]');
for (const [name, el] of [['again', again], ['known', known]]) {
  const bg = await el.evaluate((n) => getComputedStyle(n).backgroundColor + '|' + getComputedStyle(n).backgroundImage);
  const vb = await el.isVisible();
  console.log(`${name} visible=${vb} bg=${bg}`);
}

await browser.close();
console.log('DONE');
