import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const creds = JSON.parse(readFileSync('/Users/kazu.nx/.config/devin/secrets/ea_demo_creds.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('response', async (r) => {
  if (r.status() >= 400) {
    const body = await r.text().catch(() => '');
    console.log(`HTTP ${r.status()} ${r.url()}\n  BODY: ${body.slice(0, 300)}`);
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
// expand Luyện & thi accordion
await page.getByText('Luyện & thi').first().click();
await page.waitForTimeout(1000);
// click English Luyện đề
await page.locator('[data-testid="drill-english"], [data-testid="exam-program-english"]').first().click().catch(async () => {
  await page.getByText('Luyện đề').first().click();
});
for (let i = 0; i < 25; i++) {
  const body = await page.locator('body').textContent();
  if (/Câu\s*\d+\s*\/|Báo lỗi câu|Đang lấy đề/.test(body) === false && /lỗi|Lỗi|thử lại|hết|đầy/i.test(body)) {
    console.log('ERRBODY:', body.replace(/\s+/g, ' ').slice(0, 400)); break;
  }
  if (/Câu\s*\d+\s*\//.test(body)) { console.log('OK - question loaded'); break; }
  await page.waitForTimeout(1000);
}
await page.screenshot({ path: '/tmp/pw-repro2.png' });
await browser.close();
