import { chromium } from 'playwright';
const USER = process.env.U;
const browser = await chromium.launchPersistentContext('/tmp/vio-probe', { headless: false });
const page = browser.pages()[0] || await browser.newPage();
page.on('response', async r => { if (/violympic|fpt|api/i.test(r.url()) && r.request().method()!=='GET') console.log('API', r.status(), r.url().slice(0,120)); });
await page.goto('https://violympic.vn/register', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
await page.locator('input[name=username]').fill(USER);
await page.locator('button:has-text("Tiếp tục")').first().click();
await page.waitForTimeout(4000);
await page.locator('input[name=fullName]').fill('Trần Minh Anh');
const fillAC = async (label, value) => {
  const ctrl = page.locator(`div.MuiFormControl-root:has(label:text-is("${label}")) input`).first();
  await ctrl.click(); await ctrl.fill(value); await page.waitForTimeout(2500);
  const opt = page.locator('[role=option], li.MuiAutocomplete-option').first();
  if (await opt.count()) { await opt.click(); return true; }
  return false;
};
for (const [label, val] of [['Tỉnh/Thành phố','Hà Nội'],['Xã/Phường','Đống Đa'],['Trường','Quang Trung'],['Khối','4'],['Ngày','15'],['Tháng','5'],['Năm','2016']]) {
  console.log(label, '->', await fillAC(label, val));
  await page.waitForTimeout(1200);
}
await page.locator('input[name=className]').fill('4A1');
await page.screenshot({ path: '/tmp/vio-before-confirm.png', fullPage: true });
await page.locator('button:has-text("Xác nhận")').first().click();
await page.waitForTimeout(6000);
console.log('url:', page.url());
const txt = await page.locator('body').innerText().catch(()=>'');
console.log(txt.slice(0, 2000));
const inputs = await page.locator('input').evaluateAll(els => els.map(e => ({type: e.type, ph: e.placeholder, name: e.name})));
console.log('inputs:', JSON.stringify(inputs));
await page.screenshot({ path: '/tmp/vio-step3.png', fullPage: true });
await browser.close();
