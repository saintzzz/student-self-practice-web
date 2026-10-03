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
for (let i = 0; i < 15; i++) {
  // answer current question by whichever control exists
  if (await page.locator('[data-testid^=exam-option-]').count()) {
    await page.locator('[data-testid^=exam-option-]').first().click();
  } else if (await page.locator('[data-testid^=exam-tf-]').count()) {
    await page.locator('[data-testid=exam-tf-true]').click();
  } else if (await page.locator('[data-testid=exam-text-input]').count()) {
    await page.locator('[data-testid=exam-text-input]').fill('a');
    await page.locator('[data-testid=exam-text-submit]').click();
  } else if (await page.locator('[data-testid^=exam-tile-]').count()) {
    // word-order: click tiles in order
    const tiles = await page.locator('[data-testid^=exam-tile-]').all();
    for (const t of tiles) await t.click().catch(()=>{});
  } else if (await page.locator('[data-testid^=exam-letter-]').count()) {
    await page.locator('[data-testid=exam-letter-0]').click();
  }
  await page.waitForTimeout(600);
  await page.locator('[data-testid=practice-next]').click().catch(()=>{});
  await page.waitForTimeout(600);
  if (await page.locator('[data-testid=arena-result]').count()) break;
}
console.log('arena result?', await page.locator('[data-testid=arena-result]').count());
console.log('verdict:', (await page.locator('[data-testid=arena-verdict]').allTextContents()).join('|'));
await page.screenshot({ path: '/tmp/arena-result.png' });
await b.close();
