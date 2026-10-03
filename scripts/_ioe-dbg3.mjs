import { chromium } from 'playwright';
const browser = await chromium.launchPersistentContext('/tmp/ioe-real-profile3', { headless: true });
const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://edu.go.vn/user/dang-nhap', { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(3000);
  const n = await page.locator('input').count();
  const tb = await page.getByRole('textbox').count();
  console.log(i, 'inputs:', n, 'textboxes:', tb, 'url:', page.url().slice(0,60));
  if (n || tb) break;
}
const html = await page.locator('body').innerHTML();
console.log(html.replace(/<style[\s\S]*?<\/style>/g,'').slice(0, 2500));
await browser.close();
