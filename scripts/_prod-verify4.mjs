import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://ea.vieschool.com', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await page.locator('text=/Chơi không cần tài khoản/i').first().click();
await page.waitForTimeout(4000);
await page.locator('text=/Lớp 4/').first().click();
await page.waitForTimeout(4000);
await page.locator('button:has-text("Luyện đề - 20 câu")').first().click();
await page.waitForTimeout(3000);
await page.locator('button:has-text("Bắt đầu luyện")').first().click();
await page.waitForTimeout(5000);
for (let i = 0; i < 5; i++) {
  const txt = await page.locator('body').innerText();
  console.log(`===== Q${i+1} =====`);
  console.log(txt.slice(0, 900));
  await page.screenshot({ path: `/tmp/prod-drill-q${i+1}.png` });
  // answer: click first option or fill
  const opts = page.locator('[data-testid*=option], button').filter({ hasText: /^[A-Da-z].{0,80}$/ });
  const n = await page.locator('button').count();
  // generic: click the first plausible option button inside question area
  const qb = page.locator('button:has-text("."), button:has-text(" "), [role=radio]').filter({ hasNotText: /Bỏ qua|Tiếp|Quay|Nghe|Bắt đầu/ });
  const clicked = await qb.first().click({ timeout: 3000 }).then(()=>true).catch(()=>false);
  if (!clicked) {
    // missing-letter typing?
    const inp = page.locator('input[type=text], input[placeholder]');
    if (await inp.count()) { await inp.first().fill('x'); await page.keyboard.press('Enter'); }
  }
  await page.waitForTimeout(2500);
  const next = page.locator('button:has-text("Tiếp"), button:has-text("Câu tiếp"), button:has-text("→")').first();
  if (await next.count()) await next.click().catch(()=>{});
  await page.waitForTimeout(2500);
}
await browser.close();
