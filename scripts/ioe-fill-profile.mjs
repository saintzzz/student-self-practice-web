// Fill IOE student profile for an already-registered account (session in profile dir)
import { chromium } from 'playwright';
const PROFILE = process.env.P || '/tmp/ioe-g1';
const GRADE = +(process.env.G || 1);
const DOB = { 1: '15/03/2019', 2: '15/03/2018', 3: '15/03/2017', 4: '15/03/2016', 5: '15/03/2015' }[GRADE];
const browser = await chromium.launchPersistentContext(PROFILE, { headless: false });
const page = browser.pages()[0] || await browser.newPage();
page.on('dialog', d => { console.log('DIALOG:', d.message().slice(0, 150)); d.accept(); });
await page.goto('https://ioe.vn/hoc-sinh', { waitUntil: 'domcontentloaded' });
// if bounced to login, log in with stored creds
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(2000);
  if (page.url().includes('dang-nhap') && await page.locator('input[type=password]').count()) {
    await page.locator('input').nth(0).fill(process.env.U);
    await page.locator('input[type=password]').first().fill(process.env.PW);
    await page.locator('button:has-text("Đăng nhập")').first().click();
    await page.waitForTimeout(6000);
  } else break;
}
for (let i = 0; i < 25; i++) {
  await page.waitForTimeout(2000);
  const txt = await page.locator('body').innerText().catch(() => '');
  const skip = page.locator('text=Để sau').first();
  if (await skip.count()) { await skip.click(); await page.waitForTimeout(3000); continue; }
  if (txt.includes('Chọn loại tài khoản') || txt.includes('Họ và tên')) break;
}
if ((await page.locator('body').innerText()).includes('Chọn loại tài khoản'))
  await page.locator('button:has-text("Học sinh")').first().click({ timeout: 10000 }).catch(() => {});
for (let t = 0; t < 15; t++) { if ((await page.locator('body').innerText()).includes('Họ và tên')) break; await page.waitForTimeout(1500); }
console.log('form ready:', page.url());

async function pick(btnText, optionText) {
  await page.locator(`button:has-text("${btnText}")`).first().click({ timeout: 10000 });
  await page.waitForTimeout(1600);
  // options may render in a dropdown list
  const opt = page.locator(`button:has-text("${optionText}"), li:has-text("${optionText}"), div[role=option]:has-text("${optionText}")`).first();
  if (await opt.count()) { await opt.click({ timeout: 6000 }); return true; }
  // fallback: any element with exact text
  const any = page.locator(`text="${optionText}"`).last();
  await any.click({ timeout: 6000 });
  return true;
}
await page.locator('input').nth(0).fill('Nguyễn Minh Anh');
await page.locator('input[placeholder*="dd/mm"]').fill(DOB);
await pick('Chọn giới tính', 'Nam');
console.log('gender done');
await pick('Chọn cấp học', 'Tiểu học');
console.log('cap done');
await pick('Chọn tỉnh', 'Hà Nội');
console.log('tinh done');
await page.waitForTimeout(2000);
await pick('Chọn Xã', 'Phường Đống Đa');
console.log('xa done');
await page.waitForTimeout(2500);
await pick('Chọn trường', 'Quang Trung');
console.log('truong done');
await page.waitForTimeout(2000);
await pick('Chọn khối', `Khối ${GRADE}`);
console.log('khoi done');
await page.locator('input[placeholder*="A1"], input').last().fill(`${GRADE}A1`);
await page.screenshot({ path: '/tmp/filled.png', fullPage: true });
await page.locator('button:has-text("Hoàn tất")').first().click().catch(async () => {
  await page.locator('text=Hoàn tất đăng ký').first().click();
});
await page.waitForTimeout(9000);
const skip = page.locator('text=Để sau').first();
if (await skip.count()) { await skip.click(); await page.waitForTimeout(4000); }
console.log('final:', page.url());
console.log((await page.locator('body').innerText()).slice(0, 400));
await browser.close();
