import { chromium } from 'playwright';
import fs from 'fs';
const PROFILE = process.env.P ?? '/tmp/ioe-pw-profile2';
const OUTDIR = process.env.OUT ?? 'docs/research/ioe/tuluyen';
const MAXVONG = +(process.env.MAXVONG ?? 8);
fs.mkdirSync(OUTDIR, { recursive: true });
const browser = await chromium.launchPersistentContext(PROFILE, { headless: false });
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
async function goHome() {
  if (!page.url().includes('ioe.vn/hoc-sinh/tu-luyen'))
    await page.goto('https://ioe.vn/hoc-sinh/tu-luyen', { waitUntil: 'domcontentloaded' }).catch(() => {});
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(1500);
    const skip = page.locator('text=Để sau').first();
    if (await skip.count()) { await skip.click(); await page.waitForTimeout(3000); continue; }
    if (await page.locator('.ioe-exam-detail__do-btn').count() > 0) return true;
  }
  return false;
}
await goHome();
const seen = new Set();
for (let v = 1; v <= MAXVONG; v++) {
  // click "Vòng Tự luyện N" entry to switch round
  await goHome();
  const sw = await page.locator(`[data-testid="round-list-item-${v}"]`).first().click({ timeout: 8000 }).then(() => true).catch(() => false);
  if (sw) await page.waitForTimeout(6000);
  const cur = await page.locator('text=/Vòng Tự luyện \\d+ - Khối/').first().innerText().catch(() => '');
  console.log('=== vong', v, '| page shows:', cur.trim(), '|');
  for (let b = 0; b < 6; b++) {
    await goHome();
    // re-switch vòng if page reset to current
    if (sw) { await page.locator(`[data-testid="round-list-item-${v}"]`).first().click({ timeout: 8000 }).catch(() => {}); await page.waitForTimeout(5000); }
    const btns = page.locator('.ioe-exam-detail__do-btn');
    const n = await btns.count();
    if (b >= n) break;
    lastSetinfo = null;
    await btns.nth(b).click().catch(e => console.log('  click err', e.message.slice(0, 60)));
    for (let t = 0; t < 12 && !lastSetinfo; t++) await page.waitForTimeout(1000);
    if (!lastSetinfo) { console.log('  btn', b, ': no setinfo'); continue; }
    const data = JSON.parse(lastSetinfo);
    const ug = data?.data?.urlgame;
    if (!ug) { console.log('  btn', b, 'err:', data?.message); continue; }
    const key = ug.match(/key=([^&]+)/)?.[1];
    const game = ug.match(/lam-bai\/([^/?]+)/)?.[1];
    if (seen.has(key)) { console.log('  btn', b, 'dup', game); continue; }
    seen.add(key);
    console.log('  btn', b, '->', game, key);
    await page.goto(ug, { waitUntil: 'domcontentloaded' }).catch(e => console.log('  nav err', e.message.slice(0, 60)));
    await page.waitForTimeout(10000);
  }
}
console.log('DONE. captured:', captured);
await browser.close();
