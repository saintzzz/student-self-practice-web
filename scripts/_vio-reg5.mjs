import { chromium } from 'playwright';
const USER = process.env.U, PW = process.env.PW;
const browser = await chromium.launchPersistentContext('/tmp/vio-probe', { headless: false });
const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://violympic.vn/register', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
await page.locator('input[name=username]').fill(USER);
await page.locator('button:has-text("Tiếp tục")').first().click();
await page.waitForTimeout(5000);
const dump = async (tag) => {
  const inputs = await page.locator('input,select').evaluateAll(els => els.map(e => ({tag:e.tagName, type: e.type, ph: e.placeholder, name: e.name})));
  console.log(tag, 'url:', page.url(), 'inputs:', JSON.stringify(inputs));
  const txt = await page.locator('body').innerText().catch(()=>'');
  console.log(txt.slice(0, 1200));
  await page.screenshot({ path: `/tmp/vio-${tag}.png`, fullPage: true });
};
await dump('step2');
// try to proceed generically: fill all visible inputs
await browser.close();
