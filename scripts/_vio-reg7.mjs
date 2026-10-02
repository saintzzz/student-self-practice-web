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
// MUI autocompletes: label text -> sibling input
const fillAC = async (label, value) => {
  const inp = page.locator(`div.MuiAutocomplete-root:has-text("${label}") input, label:has-text("${label}")`).first();
  // find input inside the same FormControl
  const ctrl = page.locator(`div.MuiFormControl-root:has(label:text-is("${label}")) input`).first();
  await ctrl.click();
  await ctrl.fill(value);
  await page.waitForTimeout(2000);
  // pick first option
  const opt = page.locator('[role=option], li.MuiAutocomplete-option').first();
  if (await opt.count()) { await opt.click(); return true; }
  return false;
};
for (const [label, val] of [['Tỉnh/Thành phố','Hà Nội'],['Xã/Phường','Đống Đa'],['Trường','Quang Trung'],['Khối','4'],['Lớp','4']]) {
  const ok = await fillAC(label, val);
  console.log(label, '->', ok);
  await page.waitForTimeout(1500);
}
await page.screenshot({ path: '/tmp/vio-step2b.png', fullPage: true });
await browser.close();
