import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const page = await b.newPage();
page.setDefaultTimeout(4000);
const shot = n => page.screenshot({ path: `/tmp/ui-${n}.png` }).catch(()=>{});
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /không cần tài khoản|Chơi không/i }).first().click();
await page.getByRole('button', { name: /Lớp 2/i }).first().click();
await page.getByRole('button', { name: /Luyện đề/i }).nth(1).click();
console.log('TITLE:', (await page.locator('h1,h2').allTextContents()).join(' | '));
await page.getByRole('button', { name: /Bắt đầu luyện/i }).click();
await page.waitForTimeout(1200);
let imgQ = 0;
for (let i = 0; i < 20; i++) {
  const vio = await page.locator('img[src*="/images/vio/"]').count();
  const label = (await page.locator('body').innerText().catch(()=> '')).match(/Câu\s*\d+[^\n]*/)?.[0] ?? `step${i}`;
  console.log(label, '| vio imgs:', vio);
  if (vio) { imgQ++; await shot(`q${i}`); }
  // advance: answer then click next/submit-ish buttons
  const txt = page.locator('input[type=text]').first();
  if (await txt.count()) {
    await txt.fill('5');
    const sub = page.getByRole('button', { name: /Trả lời|Kiểm tra/i }).first();
    if (await sub.count()) await sub.click().catch(()=>{});
  } else {
    await page.locator('button:has(img), main button').nth(1).click().catch(()=>{});
  }
  await page.waitForTimeout(600);
  const next = page.getByRole('button', { name: /Câu tiếp|Tiếp theo|Tiếp tục|Xem kết quả|Kết thúc/i }).first();
  if (await next.count()) await next.click().catch(()=>{});
  await page.waitForTimeout(600);
  const done = await page.getByText(/Kết quả/i).count();
  if (done && i > 5) { console.log('exam ended at', i); break; }
}
await shot('end');
console.log('image questions seen:', imgQ);
await b.close();
