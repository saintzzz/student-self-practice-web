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

// grade-3 sees all 15 cards (quiz-show is grades 3-5)
await page.locator('[data-testid="grade-card-grade-3"]').first().click();
await page.waitForTimeout(2500);

await page.locator('[data-testid="hub-tile-games"]').first().click();
await page.waitForTimeout(1200);
console.log('shelf:', await page.locator('[data-testid="game-zone-shelf"]').count());
console.log('cards:', await page.locator('[data-testid^="game-card-"]').count());
await page.screenshot({ path: shot('cr88-shelf.png'), fullPage: true });

// Balloon Pop -> level picker shows first
await page.locator('[data-testid="game-card-balloon-pop"]').click();
await page.waitForTimeout(2500);
console.log('level picker:', await page.locator('[data-testid="game-level-picker"]').count());
await page.screenshot({ path: shot('cr88-levels.png') });

// Pick Man 2 -> game mounts + timer running
await page.locator('[data-testid="game-level-2"]').click();
await page.waitForTimeout(2500);
console.log('balloon:', await page.locator('[data-testid="game-balloon-pop"]').count());
console.log('timer:', await page.locator('[data-testid="game-timer"]').count());
const t1 = await page.locator('[data-testid="game-timer"]').textContent();
await page.waitForTimeout(1600);
const t2 = await page.locator('[data-testid="game-timer"]').textContent();
console.log('timer ticks:', t1, '->', t2);
await page.screenshot({ path: shot('cr88-balloon-l2.png') });

// Play one answer then finish by exiting through end flow
await page.locator('[data-testid="option-0"]').first().click({ force: true });
await page.waitForTimeout(1200);
await page.locator('[data-testid="game-exit"]').click();
await page.waitForTimeout(1500);

// Maze Chase level 3 - harder board
await page.locator('[data-testid="hub-tile-games"]').first().click();
await page.waitForTimeout(900);
await page.locator('[data-testid="game-card-maze-chase"]').click();
await page.waitForTimeout(2000);
await page.locator('[data-testid="game-level-3"]').click();
await page.waitForTimeout(3000);
console.log('maze l3:', await page.locator('[data-testid="game-maze-chase"]').count());
await page.screenshot({ path: shot('cr88-maze-l3.png') });
await page.locator('[data-testid="game-exit"]').click();
await page.waitForTimeout(1200);

await browser.close();
console.log('DONE');
