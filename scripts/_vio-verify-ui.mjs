import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const page = await b.newPage();
const shot = n => page.screenshot({ path: `/tmp/ui-${n}.png` });
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /không cần tài khoản|Chơi không/i }).first().click();
await page.waitForTimeout(800); await shot('grade');
// pick grade 2
await page.getByRole('button', { name: /Lớp 2/i }).first().click();
await page.waitForTimeout(800); await shot('home');
const btns = await page.locator('button').allTextContents();
console.log('HOME:', btns.filter(t=>t.trim()).join(' | '));
await b.close();
