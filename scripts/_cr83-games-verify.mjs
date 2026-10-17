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

// Pick a grade (postcard trail map)
await page.locator('[data-testid="grade-card-grade-2"]').first().click();
await page.waitForTimeout(2500);

// Expand the Game Zone hub tile, then the shelf shows
await page.locator('[data-testid="hub-tile-games"]').first().click();
await page.waitForTimeout(1200);
const shelf = page.locator('[data-testid="game-zone-shelf"]');
console.log('shelf visible:', await shelf.count());
console.log('game cards:', await page.locator('[data-testid^="game-card-"]').count());
await page.screenshot({ path: shot('cr83-hub.png'), fullPage: true });

// Open Balloon Pop
await page.locator('[data-testid="game-card-balloon-pop"]').click();
await page.waitForTimeout(3500);
console.log('balloon screen:', await page.locator('[data-testid="game-balloon-pop"]').count());
console.log('options:', await page.locator('[data-testid^="option-"]').count());
await page.screenshot({ path: shot('cr83-balloon.png') });

// Pop one balloon (any option) then exit
await page.locator('[data-testid="option-0"]').first().click({ force: true });
await page.waitForTimeout(1200);
await page.locator('[data-testid="game-exit"]').click();
await page.waitForTimeout(1500);

// Re-expand the hub tile (it collapses on return), then open tic-tac-toe
await page.locator('[data-testid="hub-tile-games"]').first().click();
await page.waitForTimeout(1000);
await page.locator('[data-testid="game-card-tic-tac-toe"]').click();
await page.waitForTimeout(3500);
console.log('ttt screen:', await page.locator('[data-testid="game-tic-tac-toe"]').count());
console.log('ttt cells:', await page.locator('[data-testid^="ttt-cell-"]').count());
await page.locator('[data-testid="ttt-cell-4"]').click();
await page.waitForTimeout(600);
console.log('ttt options after cell pick:', await page.locator('[data-testid^="option-"]').count());
await page.screenshot({ path: shot('cr83-ttt.png') });

await browser.close();
console.log('DONE');
