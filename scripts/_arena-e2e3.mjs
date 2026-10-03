import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const page = await b.newPage();
page.setDefaultTimeout(4000);
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.evaluate(() => localStorage.setItem('beheo-force-guest', '1'));
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await page.getByRole('button', { name: /không cần tài khoản|Chơi không/i }).first().click().catch(()=>{});
await page.getByRole('button', { name: /Lớp 3/i }).first().click().catch(()=>{});
await page.waitForTimeout(600);
await page.getByTestId('arena-create').click();
await page.waitForTimeout(600);
await page.getByTestId('exam-begin').click();
await page.waitForTimeout(1000);
for (let i = 0; i < 60; i++) {
  const verdict = await page.locator('[data-testid=practice-verdict]').count();
  if (verdict) { await page.locator('[data-testid=practice-next]').click().catch(()=>{}); await page.waitForTimeout(500); continue; }
  const opts = await page.locator('[data-testid^=exam-option-]').count();
  const tf = await page.locator('[data-testid^=exam-tf-]').count();
  const txt = await page.locator('[data-testid=exam-text-input]').count();
  const tiles = await page.locator('[data-testid^=exam-tile-]').count();
  const letters = await page.locator('[data-testid^=exam-letter-]').count();
  const prog = await page.locator('[data-testid=exam-progress]').textContent().catch(()=>'?');
  console.log(`step${i} ${prog} opts=${opts} tf=${tf} txt=${txt} tiles=${tiles} letters=${letters}`);
  if (opts) await page.locator('[data-testid^=exam-option-]').first().click();
  else if (tf) await page.locator('[data-testid=exam-tf-true]').click();
  else if (txt) { await page.locator('[data-testid=exam-text-input]').fill('a'); await page.locator('[data-testid=exam-text-submit]').click(); }
  else if (tiles) await page.locator('[data-testid^=exam-tile-]').first().click(); // one at a time
  else if (letters) await page.locator('[data-testid=exam-letter-0]').click();
  await page.waitForTimeout(400);
  if (await page.locator('[data-testid=arena-result]').count()) break;
}
await page.screenshot({ path: '/tmp/arena-result.png' });
console.log('arena result?', await page.locator('[data-testid=arena-result]').count());
console.log('verdict:', (await page.locator('[data-testid=arena-verdict]').allTextContents()).join('|'));
await b.close();
