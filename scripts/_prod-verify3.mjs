import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://ea.vieschool.com', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await page.locator('text=/Chơi không cần tài khoản/i').first().click();
await page.waitForTimeout(4000);
await page.locator('text=/Lớp 4/').first().click();
await page.waitForTimeout(4000);
// find buttons
const btns = await page.locator('button, a').evaluateAll(els => els.map(e => e.textContent?.trim().slice(0,60)).filter(Boolean));
console.log('buttons:', JSON.stringify(btns));
await page.locator('button:has-text("Luyện đề - 20 câu")').first().click();
await page.waitForTimeout(5000);
await page.screenshot({ path: '/tmp/prod-drill-q1.png', fullPage: true });
console.log('--- drill ---');
console.log((await page.locator('body').innerText()).slice(0, 1500));
await browser.close();
