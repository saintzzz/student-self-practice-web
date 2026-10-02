import { chromium } from 'playwright';
const USER = process.env.U;
const browser = await chromium.launchPersistentContext('/tmp/vio-probe', { headless: false });
const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://violympic.vn/register', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
await page.locator('input[name=username]').fill(USER);
await page.locator('button:has-text("Tiếp tục")').first().click();
await page.waitForTimeout(4000);
// pick Học sinh radio
await page.locator('label:has-text("Học sinh")').first().click().catch(()=>{});
await page.locator('input[name=fullName]').fill('Trần Minh Anh');
// skip email + phone - test if optional
// click Tỉnh dropdown
const txt = async () => (await page.locator('body').innerText());
// inspect form control structure around Tỉnh
const formHtml = await page.locator('form, [class*=register], [class*=form]').first().innerHTML().catch(()=>'');
console.log(formHtml.slice(0, 3000));
await page.screenshot({ path: '/tmp/vio-step2.png', fullPage: true });
await browser.close();
