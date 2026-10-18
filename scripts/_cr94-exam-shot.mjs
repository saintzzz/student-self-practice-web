import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const BASE = 'http://localhost:5199';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const guest = page.locator('[data-testid="guest-button"]').first();
if (await guest.count()) { await guest.click(); await page.waitForTimeout(2000); }
await page.locator('[data-testid="grade-card-grade-3"]').first().click();
await page.waitForTimeout(1800);
await page.locator('[data-testid="hub-tile-learn"]').first().click();
await page.waitForTimeout(1200);
await page.locator('[data-testid="exam-program-english"]').first().click();
await page.waitForTimeout(3000);
await page.screenshot({ path: join(tmpdir(), 'exam-intro.png'), fullPage: true });
const start = page.locator('button:has-text("Bắt đầu"), [data-testid="start-exam"], [data-testid="exam-start"]').first();
if (await start.count()) { await start.click().catch((e)=>console.log('start click fail', e.message)); await page.waitForTimeout(2500); }
await page.screenshot({ path: join(tmpdir(), 'exam-paper.png'), fullPage: true });
console.log('DONE');
await browser.close();
