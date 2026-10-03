import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const page = await b.newPage();
page.setDefaultTimeout(5000);
await page.goto('https://ea.vieschool.com', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await page.getByRole('button', { name: /không cần tài khoản|Chơi không/i }).first().click().catch(()=>{});
await page.getByRole('button', { name: /Lớp 2/i }).first().click().catch(()=>{});
await page.getByRole('button', { name: /Luyện đề/i }).nth(1).click().catch(()=>{});
console.log('TITLE:', (await page.locator('h1,h2').allTextContents()).join(' | '));
await page.getByRole('button', { name: /Bắt đầu luyện/i }).click().catch(()=>{});
await page.waitForTimeout(1500);
let imgQ = 0;
for (let i = 0; i < 12; i++) {
  const vio = await page.locator('img[src*="/images/vio/"]').count();
  if (vio) { imgQ++; await page.screenshot({ path: `/tmp/prod-q${i}.png` }); console.log('Q', i, 'vio imgs:', vio); }
  const txt = page.locator('input[type=text]').first();
  if (await txt.count()) { await txt.fill('5'); await page.getByRole('button', { name: /Trả lời|Kiểm tra|ANSWER/i }).first().click().catch(()=>{}); }
  else await page.locator('main button').nth(1).click().catch(()=>{});
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /Câu tiếp|Tiếp theo|Tiếp tục|Kết thúc|Xem kết quả/i }).first().click().catch(()=>{});
  await page.waitForTimeout(700);
}
console.log('image questions on prod:', imgQ);
await b.close();
