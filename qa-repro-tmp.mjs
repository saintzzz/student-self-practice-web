import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const creds = JSON.parse(readFileSync('/Users/kazu.nx/.config/devin/secrets/ea_demo_creds.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERR ' + String(e).slice(0, 200)));
page.on('response', (r) => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url().slice(-80)}`); });
await page.goto('https://ea.vieschool.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.getByText('Vào luyện ngay').first().click().catch(() => {});
await page.waitForTimeout(2000);
await page.locator('input').first().fill('demo_hs');
await page.locator('input[type="password"], input[inputmode="numeric"]').last().fill(creds.pins.demo_hs);
await page.getByRole('button', { name: /Đăng nhập|Vào/i }).first().click();
// wait for grade picker
for (let i = 0; i < 40; i++) { if (await page.getByText('Lớp 3').count()) break; await page.waitForTimeout(1500); }
await page.getByText('Lớp 3').first().click();
await page.waitForTimeout(1500);
// open Luyện & thi section then drill
const sec = page.locator('[data-testid="drill-english"], [data-testid="exam-program-english"]');
if (!(await sec.count())) { await page.getByText('Luyện').first().click().catch(() => {}); await page.waitForTimeout(1200); }
await page.locator('[data-testid="drill-english"], [data-testid="exam-program-english"]').first().click().catch(async () => { await page.getByText('Luyện đề').first().click(); });
// watch question load
for (let i = 0; i < 30; i++) {
  const body = await page.locator('body').textContent();
  if (/Câu\s*\d+|lỗi|Lỗi|thử lại|rate/i.test(body)) { console.log('BODY:', body.replace(/\s+/g, ' ').slice(0, 500)); break; }
  await page.waitForTimeout(1000);
}
console.log('ERRS:', JSON.stringify(errs.slice(0, 8)));
await page.screenshot({ path: '/tmp/pw-repro.png' });
await browser.close();
