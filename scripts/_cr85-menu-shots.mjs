import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const shot = (name) => join(tmpdir(), name);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const BASE = process.env.BASE ?? 'http://localhost:5173';

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const guest = page.locator('[data-testid="guest-button"]').first();
if (await guest.count()) {
  await guest.click();
  await page.waitForTimeout(2500);
}
await page.locator('[data-testid="grade-card-grade-3"]').first().click();
await page.waitForTimeout(2500);

await page.screenshot({ path: shot('menu-collapsed.png'), fullPage: true });

await page.locator('[data-testid="hub-tile-games"]').first().click();
await page.waitForTimeout(1200);
console.log('shelf:', await page.locator('[data-testid="game-zone-shelf"]').count());
console.log('cards:', await page.locator('[data-testid^="game-card-"]').count());
await page.screenshot({ path: shot('menu-games-open.png'), fullPage: true });

await browser.close();
console.log('DONE');
