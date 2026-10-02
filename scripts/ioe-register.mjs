// Full flow: register creds -> chọn Học sinh -> điền hồ sơ -> IOE. One SPA session.
// Usage: node scripts/ioe-register.mjs <grade> <user> <pass> <name> <class>
import { chromium } from 'playwright';

const [grade, user, pass, name = 'Nguyễn Minh Anh', clazz] = process.argv.slice(2);
const CLS = clazz || `${grade}A1`;
const PROFILE = `/tmp/ioe-g${grade}`;
const browser = await chromium.launchPersistentContext(PROFILE, { headless: false });
const page = browser.pages()[0] || await browser.newPage();
page.on('dialog', d => { console.log('DIALOG:', d.message().slice(0, 150)); d.accept(); });
page.on('response', async r => {
  if (r.url().includes('api-edu') && /register|profile|user|GDPT/i.test(r.url()))
    console.log('API', r.status(), r.url().replace('https://api-edu.go.vn', '').slice(0, 80));
});

async function waitText(marker, tries = 14) {
  for (let t = 0; t < tries; t++) {
    const txt = await page.locator('body').innerText().catch(() => '');
    if (txt.includes(marker)) return true;
    await page.waitForTimeout(1500);
  }
  return false;
}
async function gotoRetry(url, marker) {
  for (let i = 0; i < 6; i++) {
    await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => {});
    if (await waitText(marker)) return true;
    console.log('retry', i, url);
  }
  return false;
}
async function clickText(t) {
  const e = page.locator(`text=${t}`).last();
  await e.scrollIntoViewIfNeeded().catch(() => {});
  await e.click({ timeout: 8000 });
}
async function pickDropdown(labelContains, optionText) {
  // click the dropdown that has label or shows placeholder near label
  const dd = page.locator(`div:has-text("${labelContains}")`).last();
  await dd.click({ timeout: 8000 });
  await page.waitForTimeout(1200);
  await clickText(optionText);
}

// STEP 1: register credentials
await gotoRetry('https://ioe.vn/sso/register?returnUrl=%2Ftrang-chu', 'Đăng ký');
console.log('register form up');
await page.locator('input').nth(0).fill(user);
const pws = page.locator('input[type=password]');
await pws.nth(0).fill(pass);
if (await pws.count() > 1) await pws.nth(1).fill(pass);
const cb = page.locator('input[type=checkbox]').first();
if (await cb.count()) { if (!(await cb.isChecked().catch(() => true))) await cb.check().catch(() => cb.click()); }
await clickText('Đăng ký');
await page.waitForTimeout(7000);
console.log('after reg:', page.url());
// STEP 1b: edu.go.vn dang-ky form (redirected from ioe register)
if (page.url().includes('edu.go.vn')) {
  for (let i = 0; i < 6; i++) {
    const n = await page.locator('input').count();
    if (n >= 3) break;
    await page.waitForTimeout(2000);
    if (i === 3) await page.reload({ waitUntil: 'domcontentloaded' });
  }
  console.log('edu dang-ky inputs:', await page.locator('input').count());
  console.log(JSON.stringify(await page.locator('input').evaluateAll(els => els.map(e => ({ ph: e.placeholder, type: e.type })))));
  await page.locator('input').nth(0).fill(user);
  const pws2 = page.locator('input[type=password]');
  await pws2.nth(0).fill(pass);
  if (await pws2.count() > 1) await pws2.nth(1).fill(pass);
  const cb2 = page.locator('input[type=checkbox]').first();
  if (await cb2.count()) { if (!(await cb2.isChecked().catch(() => true))) await cb2.check().catch(() => cb2.click()); }
  await page.locator('button:has-text("Đăng ký")').first().click().catch(() => clickText('Đăng ký'));
  await page.waitForTimeout(8000);
  console.log('after edu reg:', page.url());
}

// STEP 2: choose Học sinh (may auto-land here)
await waitText('Học sinh');
await clickText('Học sinh');
await page.waitForTimeout(7000);
console.log('after type:', page.url());
console.log((await page.locator('body').innerText()).slice(0, 500));
await page.screenshot({ path: `/tmp/reg-${grade}-form.png` });
await browser.close();
