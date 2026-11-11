import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const creds = JSON.parse(readFileSync('/Users/kazu.nx/.config/devin/secrets/ea_demo_creds.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('response', async (r) => {
  if (r.status() >= 400 && !r.url().includes('cloudflare')) {
    const body = await r.text().catch(() => '');
    console.log(`HTTP ${r.status()} ${r.url().split('?')[0].slice(-90)}\n  ${body.slice(0, 250)}`);
  }
});
await page.goto('https://ea.vieschool.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.getByText('Vào luyện ngay').first().click().catch(() => {});
await page.waitForTimeout(2000);
await page.locator('input').first().fill('demo_hs');
await page.locator('input[type="password"], input[inputmode="numeric"]').last().fill(creds.pins.demo_hs);
await page.getByRole('button', { name: /Đăng nhập|Vào/i }).first().click();
for (let i = 0; i < 40; i++) { if (await page.getByText('Lớp 3').count()) break; await page.waitForTimeout(1500); }
await page.getByText('Lớp 3').first().click();
await page.waitForTimeout(2000);
await page.getByText('Luyện & thi').first().click();
await page.waitForTimeout(1000);
await page.getByText('Luyện đề').first().click();
await page.waitForTimeout(1500);
await page.getByRole('button', { name: 'Bắt đầu luyện' }).click();
for (let i = 0; i < 30; i++) {
  const body = await page.locator('body').textContent();
  if (/Câu\s*\d+\s*\//.test(body)) { console.log('OK - question loaded:', body.match(/Câu\s*\d+\s*\/\s*\d+/)?.[0]); break; }
  if (/lỗi|Lỗi|thử lại|Không tải|hết lượt|rate/i.test(body)) {
    console.log('ERRBODY:', body.replace(/\s+/g, ' ').slice(0, 450)); break;
  }
  await page.waitForTimeout(1000);
}
await page.screenshot({ path: '/tmp/pw-repro3.png' });
await browser.close();
