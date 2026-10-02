// Register + fill student profile in one session. Args: grade user pass
import { chromium } from 'playwright';
const [GRADE, user, pass] = process.argv.slice(2);
const g = +GRADE;
const DOB = { 1: '15/03/2019', 2: '15/03/2018', 3: '15/03/2017', 4: '15/03/2016', 5: '15/03/2015' }[g];
const PROFILE = `/tmp/ioe-g${g}`;
const browser = await chromium.launchPersistentContext(PROFILE, { headless: false });
const page = browser.pages()[0] || await browser.newPage();
page.on('dialog', d => { console.log('DIALOG:', d.message().slice(0, 130)); d.accept(); });

async function waitFor(marker, tries = 16) {
  for (let t = 0; t < tries; t++) {
    const txt = await page.locator('body').innerText().catch(() => '');
    if (txt.includes(marker)) return true;
    await page.waitForTimeout(1500);
  }
  return false;
}
// register creds
for (let i = 0; i < 6; i++) {
  await page.goto('https://ioe.vn/sso/register?returnUrl=%2Ftrang-chu', { waitUntil: 'domcontentloaded' }).catch(() => {});
  if (await page.waitForSelector('input', { timeout: 12000 }).then(() => true).catch(() => false)) break;
  console.log('reg retry', i);
}
await page.locator('input').nth(0).fill(user);
const pws = page.locator('input[type=password]');
await pws.nth(0).fill(pass);
if (await pws.count() > 1) await pws.nth(1).fill(pass);
const cb = page.locator('input[type=checkbox]').first();
if (await cb.count() && !(await cb.isChecked().catch(() => true))) await cb.check().catch(() => cb.click());
await page.locator('button:has-text("Đăng ký")').first().click();
await page.waitForTimeout(9000);
console.log('post-reg url:', page.url());
// may land on loai-tai-khoan or another register form
await waitFor('Học sinh');
await page.locator('button:has-text("Học sinh")').first().click({ timeout: 10000 });
await waitFor('Họ và tên');
console.log('profile form ready');
async function pick(btnText, optionText) {
  await page.locator(`button:has-text("${btnText}")`).first().click({ timeout: 10000 });
  await page.waitForTimeout(1600);
  const opt = page.locator(`text="${optionText}"`).last();
  await opt.click({ timeout: 8000 });
  await page.waitForTimeout(1000);
}
await page.locator('input').nth(0).fill('Nguyễn Minh Anh');
await page.locator('input[placeholder*="dd/mm"]').fill(DOB);
await pick('Chọn giới tính', 'Nam');
await pick('Chọn cấp học', 'Tiểu học');
await pick('Chọn tỉnh', 'Hà Nội');
await page.waitForTimeout(1500);
await pick('Chọn Xã', 'Phường Đống Đa');
await page.waitForTimeout(2500);
await pick('Chọn trường', 'Quang Trung');
await page.waitForTimeout(1500);
await pick('Chọn khối', `Khối ${g}`);
await page.locator('input[placeholder*="A1"]').fill(`${g}A1`);
await page.locator('button:has-text("Hoàn tất")').first().click().catch(() => page.locator('text=Hoàn tất đăng ký').first().click());
await page.waitForTimeout(9000);
const skip = page.locator('text=Để sau').first();
if (await skip.count()) { await skip.click(); await page.waitForTimeout(4000); }
console.log('final:', page.url());
console.log((await page.locator('body').innerText()).slice(0, 300));
await browser.close();
