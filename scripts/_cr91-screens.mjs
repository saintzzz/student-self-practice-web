import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const shot = (n) => join(tmpdir(), n);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const BASE = process.env.BASE ?? 'http://localhost:5199';

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const guest = page.locator('[data-testid="guest-button"]').first();
if (await guest.count()) { await guest.click(); await page.waitForTimeout(2500); }
await page.screenshot({ path: shot('cr91-1-grade-map.png') });

await page.locator('[data-testid="grade-card-grade-1"]').first().click();
await page.waitForTimeout(2500);
await page.screenshot({ path: shot('cr91-2-hub.png'), fullPage: true });

const choi = page.locator('[data-testid="cta-play"], button:has-text("Chơi")').first();
if (await choi.count()) { await choi.click(); await page.waitForTimeout(3000); }
await page.screenshot({ path: shot('cr91-3-batch.png'), fullPage: true });

for (let i = 0; i < 4; i++) {
  try {
    const opt = page.locator('[data-testid^="option-"]').first();
    if (await opt.count()) { await opt.click({ timeout: 3000 }); }
    await page.waitForTimeout(2500);
    await page.screenshot({ path: shot(`cr91-4-q${i}.png`), fullPage: true });
    const next = page.locator('[data-testid="next-button"]');
    if (await next.count() && await next.isEnabled({ timeout: 2000 }).catch(() => false)) {
      await next.click({ timeout: 3000 });
      await page.waitForTimeout(2000);
    }
  } catch (e) { console.log('q', i, 'skip:', e.message.slice(0, 80)); }
}

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const guest2 = page.locator('[data-testid="guest-button"]').first();
if (await guest2.count()) { await guest2.click(); await page.waitForTimeout(2000); }
await page.locator('[data-testid="grade-card-grade-3"]').first().click();
await page.waitForTimeout(2500);
await page.locator('[data-testid="hub-tile-games"]').first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: shot('cr91-5-gameshelf.png'), fullPage: true });

console.log('SHOTS DONE');
await browser.close();
