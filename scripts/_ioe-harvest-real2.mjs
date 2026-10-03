import { chromium } from 'playwright';
import fs from 'fs';
const PROFILE = '/tmp/ioe-real-profile';
const OUTDIR = '/tmp/ioe-caps-real';
fs.mkdirSync(OUTDIR, { recursive: true });
const browser = await chromium.launchPersistentContext(PROFILE, { headless: true });
let captured = 0, lastSetinfo = null;
await browser.route('**/api-edu.go.vn/**', async route => {
  const u = route.request().url();
  try {
    const resp = await route.fetch();
    const body = await resp.text();
    if (/game\/getinfo/.test(u)) {
      fs.writeFileSync(`${OUTDIR}/cap-${Date.now()}-${++captured}.json`, body);
      console.log('  CAP getinfo', body.length);
    } else if (/setinfo/.test(u)) { lastSetinfo = body; }
    await route.fulfill({ response: resp });
  } catch { await route.continue(); }
});
const page = browser.pages()[0] || await browser.newPage();
await page.goto('https://ioe.vn/sso/login?returnUrl=%2Fhoc-sinh', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
if (await page.locator('input[type=password]').count()) {
  await page.locator('input').nth(0).fill(process.env.U);
  await page.locator('input[type=password]').first().fill(process.env.PW);
  await page.locator('input[type=password]').first().press('Enter');
  await page.waitForTimeout(8000);
}
async function goHome() {
  if (!page.url().includes('ioe.vn/hoc-sinh/tu-luyen'))
    await page.goto('https://ioe.vn/hoc-sinh/tu-luyen', { waitUntil: 'domcontentloaded' }).catch(() => {});
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(1500);
    const skip = page.locator('text=Để sau').first();
    if (await skip.count()) { await skip.click(); await page.waitForTimeout(2500); continue; }
    if (await page.locator('.ioe-exam-detail__do-btn').count() > 0) return true;
  }
  return false;
}
await goHome();
const btns = page.locator('.ioe-exam-detail__do-btn');
const n = await btns.count();
console.log('exercise buttons:', n);
const seen = new Set();
for (let b = 0; b < n; b++) {
  await goHome();
  lastSetinfo = null;
  await page.locator('.ioe-exam-detail__do-btn').nth(b).click().catch(e => console.log('click', e.message.slice(0,50)));
  for (let t = 0; t < 12 && !lastSetinfo; t++) await page.waitForTimeout(1000);
  if (!lastSetinfo) { console.log(' btn', b, 'no setinfo'); continue; }
  const ug = JSON.parse(lastSetinfo)?.data?.urlgame;
  if (!ug) { console.log(' btn', b, 'err'); continue; }
  const key = ug.match(/key=([^&]+)/)?.[1];
  const game = ug.match(/lam-bai\/([^/?]+)/)?.[1];
  if (seen.has(key)) continue;
  seen.add(key);
  const before = captured;
  console.log(' btn', b, '->', game);
  await page.goto(ug, { waitUntil: 'domcontentloaded' }).catch(e => console.log(' nav', e.message.slice(0,50)));
  // trigger game start: wait, dismiss dialogs, click canvas
  for (let t = 0; t < 20 && captured === before; t++) {
    await page.waitForTimeout(1500);
    for (const sel of ['text=Bắt đầu','text=OK','text=Ok','text=Bắt đầu làm bài','button:has-text("OK")','.btn-ok','text=Start']) {
      const el = page.locator(sel).first();
      if (await el.count()) { await el.click().catch(()=>{}); break; }
    }
    const cv = page.locator('canvas').first();
    if (await cv.count()) { await cv.click({ position: { x: 300, y: 300 } }).catch(()=>{}); }
  }
  console.log('   captured?', captured > before);
}
console.log('DONE. captured:', captured);
await browser.close();
