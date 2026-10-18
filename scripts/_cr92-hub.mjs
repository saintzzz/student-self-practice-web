import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const shot = (n) => join(tmpdir(), n);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const BASE = process.env.BASE ?? 'http://localhost:5199';
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const guest = page.locator('[data-testid="guest-button"]').first();
if (await guest.count()) { await guest.click(); await page.waitForTimeout(2000); }
await page.locator('[data-testid="grade-card-grade-1"]').first().click();
await page.waitForTimeout(2500);
// Expand "Luyện thêm" then its "Tiếng Anh" subtile
await page.locator('[data-testid="hub-tile-more"]').first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: shot('cr92-open-more.png') });
await page.locator('[data-testid="hub-subtile-english"]').first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: shot('cr92-open-english.png'), fullPage: true });
// Grade 3 hub open
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const guest2 = page.locator('[data-testid="guest-button"]').first();
if (await guest2.count()) { await guest2.click(); await page.waitForTimeout(2000); }
await page.locator('[data-testid="grade-card-grade-3"]').first().click();
await page.waitForTimeout(2500);
await page.locator('[data-testid="hub-tile-learn"]').first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: shot('cr92-g3-learn.png'), fullPage: true });
console.log('DONE');
await browser.close();
