import { chromium } from 'playwright';
const PROFILE = process.env.P || '/tmp/ioe-g1';
const GRADE = +(process.env.G || 1);
const DOB = { 1: '15/03/2019', 2: '15/03/2018', 3: '15/03/2017', 4: '15/03/2016', 5: '15/03/2015' }[GRADE];
const browser = await chromium.launchPersistentContext(PROFILE, { headless: false });
const page = browser.pages()[0] || await browser.newPage();
page.on('dialog', d => { console.log('DIALOG:', d.message().slice(0, 150)); d.accept(); });
await page.goto('https://ioe.vn/hoc-sinh', { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 25; i++) {
  await page.waitForTimeout(2000);
  const txt = await page.locator('body').innerText().catch(() => '');
  const skip = page.locator('text=Để sau').first();
  if (await skip.count()) { await skip.click(); await page.waitForTimeout(3000); continue; }
  if (txt.includes('Chọn loại tài khoản')) break;
  if (txt.includes('Họ và tên')) break;
}
await page.locator('button:has-text("Học sinh")').first().click({ timeout: 10000 }).catch(() => {});
for (let t = 0; t < 12; t++) {
  if ((await page.locator('body').innerText()).includes('Họ và tên')) break;
  await page.waitForTimeout(1500);
}
console.log('form url:', page.url());
async function pick(labelRe, optionText) {
  const lab = page.locator('span,div,label', { hasText: labelRe }).last();
  // click the field that belongs to this label (next sibling or parent sibling)
  const field = lab.locator('xpath=ancestor::*[1]/following-sibling::*[1]');
  if (await field.count()) await field.first().click({ timeout: 6000 });
  else await lab.click({ timeout: 6000 });
  await page.waitForTimeout(1500);
  await page.locator(`text=${optionText}`).first().click({ timeout: 8000 });
  await page.waitForTimeout(1000);
}
await page.locator('input').nth(0).fill('Nguyễn Minh Anh');
await page.locator('input[placeholder*="dd/mm"]').fill(DOB);
await pick(/Giới tính/, 'Nam');
await pick(/Cấp học/, 'Tiểu học');
await pick(/Tỉnh/, 'Hà Nội');
await page.screenshot({ path: '/tmp/f3.png', fullPage: true });
console.log((await page.locator('body').innerText()).slice(0, 700));
await browser.close();
