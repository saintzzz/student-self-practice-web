import { chromium } from 'playwright';
const browser = await chromium.launchPersistentContext('/tmp/vio-probe', { headless: false });
const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://violympic.vn/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
// dismiss any modal
for (let i = 0; i < 3; i++) {
  const modal = page.locator('.ReactModal__Overlay--after-open');
  if (!await modal.count()) break;
  const closeBtn = modal.locator('button, [class*=close], svg').first();
  await closeBtn.click().catch(()=>{});
  await page.keyboard.press('Escape').catch(()=>{});
  await page.locator('.ReactModal__Overlay--after-open').click({ position: {x:10,y:10}, force: true }).catch(()=>{});
  await page.waitForTimeout(1500);
}
await page.locator('button:has-text("Đăng ký")').first().click({ timeout: 10000 });
await page.waitForTimeout(6000);
console.log('url:', page.url());
const inputs = await page.locator('input').evaluateAll(els => els.map(e => ({type: e.type, ph: e.placeholder, name: e.name})));
console.log('inputs:', JSON.stringify(inputs));
await page.screenshot({ path: '/tmp/vio-reg-form.png', fullPage: true });
const txt = await page.locator('body').innerText().catch(()=>'');
console.log(txt.slice(0, 2500));
await browser.close();
