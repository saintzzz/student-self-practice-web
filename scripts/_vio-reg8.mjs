import { chromium } from 'playwright';
const USER = process.env.U;
const browser = await chromium.launchPersistentContext('/tmp/vio-probe', { headless: false });
const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://violympic.vn/register', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
await page.locator('input[name=username]').fill(USER);
await page.locator('button:has-text("Tiếp tục")').first().click();
await page.waitForTimeout(4000);
await page.locator('input[name=fullName]').fill('Trần Minh Anh');
const fillAC = async (label, value) => {
  const ctrl = page.locator(`div.MuiFormControl-root:has(label:text-is("${label}")) input`).first();
  await ctrl.click();
  await ctrl.fill(value);
  await page.waitForTimeout(2500);
  const opt = page.locator('[role=option], li.MuiAutocomplete-option').first();
  if (await opt.count()) { await opt.click(); return true; }
  return false;
};
for (const [label, val] of [['Tỉnh/Thành phố','Hà Nội'],['Xã/Phường','Đống Đa'],['Trường','Quang Trung'],['Khối','4']]) {
  console.log(label, '->', await fillAC(label, val));
  await page.waitForTimeout(1500);
}
// Lớp: dump control names / structure
const labels = await page.locator('label').evaluateAll(els => els.map(e => e.textContent));
console.log('labels:', JSON.stringify(labels));
// find Lớp control
const lopCtrl = page.locator('div.MuiFormControl-root:has(label:text-is("Lớp"))').first();
console.log('lop html:', (await lopCtrl.innerHTML().catch(()=>'')).slice(0, 800));
// DOB selects
for (const [label, val] of [['Ngày','15'],['Tháng','5'],['Năm','2016']]) {
  const ctrl = page.locator(`div.MuiFormControl-root:has(label:text-is("${label}")) input`).first();
  await ctrl.click().catch(()=>{});
  await ctrl.fill(val).catch(()=>{});
  await page.waitForTimeout(1500);
  const opt = page.locator('[role=option]').first();
  if (await opt.count()) await opt.click().catch(()=>{});
}
await page.screenshot({ path: '/tmp/vio-step2c.png', fullPage: true });
await browser.close();
