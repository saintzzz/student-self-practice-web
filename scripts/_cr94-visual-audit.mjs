/* CR-82 remainder audit: capture every top-level surface so the visual
   hierarchy can be judged side-by-side (grade map, hub open, batch
   summary, exam intro/paper, arena, rewards, flashcards, game shelf). */
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const shot = (n) => join(tmpdir(), n);
const BASE = process.env.BASE ?? 'http://localhost:5199';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
const log = (...a) => console.log('[audit]', ...a);

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const guest = page.locator('[data-testid="guest-button"]').first();
if (await guest.count()) { await guest.click(); await page.waitForTimeout(2500); }

// 1. Grade map (winding trail)
await page.screenshot({ path: shot('audit-1-grademap.png'), fullPage: true });

// 2. Hub open (Luyen them expanded)
await page.locator('[data-testid="grade-card-grade-3"]').first().click();
await page.waitForTimeout(2000);
await page.screenshot({ path: shot('audit-2-hub.png'), fullPage: true });
const practice = page.locator('[data-testid^="hub-tile-"]').nth(1);
if (await practice.count()) { await practice.click(); await page.waitForTimeout(1200); }
await page.screenshot({ path: shot('audit-3-hub-open.png'), fullPage: true });

// 3. Game shelf
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
const guest2 = page.locator('[data-testid="guest-button"]').first();
if (await guest2.count()) { await guest2.click(); await page.waitForTimeout(1500); }
await page.locator('[data-testid="grade-card-grade-3"]').first().click();
await page.waitForTimeout(1800);
const gamesTile = page.locator('[data-testid="hub-tile-games"]');
if (await gamesTile.count()) { await gamesTile.click(); await page.waitForTimeout(1500); }
await page.screenshot({ path: shot('audit-4-gameshelf.png'), fullPage: true });

// 4. Exam intro + paper
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
const guest3 = page.locator('[data-testid="guest-button"]').first();
if (await guest3.count()) { await guest3.click(); await page.waitForTimeout(1500); }
await page.locator('[data-testid="grade-card-grade-3"]').first().click();
await page.waitForTimeout(1800);
const examTile = page.locator('[data-testid="hub-tile-exams"], [data-testid="hub-tile-exam"], button:has-text("Thi")').first();
if (await examTile.count()) { await examTile.click(); await page.waitForTimeout(1500); }
await page.screenshot({ path: shot('audit-5-exam.png'), fullPage: true });
const startExam = page.locator('button:has-text("Bắt đầu"), [data-testid="start-exam"]').first();
if (await startExam.count()) { await startExam.click().catch(()=>{}); await page.waitForTimeout(2000); }
await page.screenshot({ path: shot('audit-6-exam-paper.png'), fullPage: true });

// 5. Arena + Rewards tiles (back on hub)
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);
const guest4 = page.locator('[data-testid="guest-button"]').first();
if (await guest4.count()) { await guest4.click(); await page.waitForTimeout(1500); }
await page.locator('[data-testid="grade-card-grade-3"]').first().click();
await page.waitForTimeout(1800);
const arena = page.locator('[data-testid="hub-tile-arena"], button:has-text("Đấu trường")').first();
if (await arena.count()) { await arena.click(); await page.waitForTimeout(2000); }
await page.screenshot({ path: shot('audit-7-arena.png'), fullPage: true });

const rewards = page.locator('[data-testid="hub-tile-rewards"], button:has-text("Phần thưởng")').first();
await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
const guest5 = page.locator('[data-testid="guest-button"]').first();
if (await guest5.count()) { await guest5.click(); await page.waitForTimeout(1500); }
await page.locator('[data-testid="grade-card-grade-3"]').first().click();
await page.waitForTimeout(1500);
if (await rewards.count()) { await rewards.click(); await page.waitForTimeout(1800); }
await page.screenshot({ path: shot('audit-8-rewards.png'), fullPage: true });

log('DONE');
await browser.close();
