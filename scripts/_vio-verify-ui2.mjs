import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const page = await b.newPage();
const shot = n => page.screenshot({ path: `/tmp/ui-${n}.png` });
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /không cần tài khoản|Chơi không/i }).first().click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: /Lớp 2/i }).first().click();
await page.waitForTimeout(800);
// subject labels on page
const heads = await page.locator('h1,h2,h3').allTextContents();
console.log('HEADS:', heads.join(' | '));
// click the LAST "Luyện đề" button (Toán TA is third subject)
const exams = page.getByRole('button', { name: /Luyện đề/i });
console.log('exam buttons:', await exams.count());
await exams.last().click();
await page.waitForTimeout(1200); await shot('exam-start');
const startBtns = await page.locator('button').allTextContents();
console.log('EXAM:', startBtns.filter(t=>t.trim()).join(' | '));
await b.close();
