// Answer oracle: start a tu-luyen game, probe each question's options via answercheck.
// Usage: P=/tmp/ioe-g1 node scripts/ioe-oracle.mjs
import { chromium } from 'playwright';
import fs from 'fs';
const PROFILE = process.env.P || '/tmp/ioe-g1';
const OUTDIR = process.env.OUT || 'docs/research/ioe/tuluyen-g1';
fs.mkdirSync(OUTDIR, { recursive: true });
const browser = await chromium.launchPersistentContext(PROFILE, { headless: false });
let setinfoBody = null, getinfoData = null;
const page = browser.pages()[0] || await browser.newPage();
page.on('dialog', d => d.accept());
await browser.route('**/api-edu.go.vn/**', async route => {
  const u = route.request().url();
  try {
    const resp = await route.fetch();
    const body = await resp.text();
    if (/game\/getinfo/.test(u)) getinfoData = body;
    else if (/setinfo/.test(u)) setinfoBody = body;
    await route.fulfill({ response: resp });
  } catch { await route.continue(); }
});
await page.goto('https://ioe.vn/hoc-sinh/tu-luyen', { waitUntil: 'domcontentloaded' });
for (let i = 0; i < 15; i++) {
  await page.waitForTimeout(1500);
  const skip = page.locator('text=Để sau').first();
  if (await skip.count()) { await skip.click(); await page.waitForTimeout(3000); continue; }
  if (await page.locator('.ioe-exam-detail__do-btn').count() > 0) break;
}
const btnIdx = +(process.env.BTN ?? 0);
await page.locator('.ioe-exam-detail__do-btn').nth(btnIdx).click().catch(e => console.log('click', e.message.slice(0, 60)));
for (let t = 0; t < 12 && !setinfoBody; t++) await page.waitForTimeout(1000);
const set = JSON.parse(setinfoBody);
const ug = set.data.urlgame;
const gameToken = ug.match(/token=([A-F0-9]+)/)?.[1];
console.log('game:', ug.match(/lam-bai\/([^/?]+)/)?.[1], '| token:', gameToken?.slice(0, 8));
// open game page so getinfo fires
const g = await browser.newPage();
await g.goto(ug, { waitUntil: 'domcontentloaded' });
for (let t = 0; t < 20 && !getinfoData; t++) await page.waitForTimeout(1000);
const gj = JSON.parse(getinfoData);
const qs = gj.data.game.question;
const examKey = gj.data.game.examKey;
console.log('questions:', qs.length, 'examKey:', examKey);
// start game first (activates token), then probe answercheck
const started = await g.evaluate(async ({ examKey, gameToken }) => {
  const r = await fetch('https://api-edu.go.vn/ioe-service/v2/game/startgame', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: 'string', token: gameToken, examKey, IPClient: 'string', deviceId: 'string', sign: 'string' })
  });
  return r.json();
}, { examKey, gameToken });
console.log('startgame:', JSON.stringify(started).slice(0, 200));
const results = await g.evaluate(async ({ qs, examKey, gameToken }) => {
  const out = [];
  for (const q of qs) {
    const entry = { id: q.id, type: q.type, tries: [] };
    const candidates = (q.ans || []).filter(a => a.content);
    for (const a of candidates) {
      try {
        const r = await fetch('https://api-edu.go.vn/ioe-service/v2/game/answercheck', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: 'string', token: gameToken, examKey, IPClient: 'string', deviceId: 'string', sign: 'string', ans: { ans: a.content, point: q.Point, questId: q.id, position: q.STT + 1 } })
        });
        const j = await r.json();
        entry.tries.push({ ans: a.content, point: j.data?.point ?? j.data, code: j.code });
      } catch (e) { entry.tries.push({ ans: a.content, err: String(e).slice(0, 60) }); }
    }
    out.push(entry);
  }
  return out;
}, { qs, examKey, gameToken });
fs.writeFileSync(`${OUTDIR}/oracle-${Date.now()}.json`, JSON.stringify({ examKey, results }, null, 1));
console.log(JSON.stringify(results.slice(0, 4), null, 1));
await browser.close();
