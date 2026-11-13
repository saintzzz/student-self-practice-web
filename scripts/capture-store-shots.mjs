// Captures Google Play store assets for English Arena:
//   - feature-graphic.png 1024x500 (brand art + wordmark, Play-required)
//   - phone screenshots 1080x2400 (540x1200 @2x) from the live app
// Output: _shots/store/
// Usage: node scripts/capture-store-shots.mjs [shots-only|graphic-only]
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

const BASE = process.env.EA_BASE_URL ?? 'https://ea.vieschool.com/app';
const OUT = path.resolve(import.meta.dirname, '../_shots/store');
const MODE = process.argv[2] ?? 'all';
const ROOT = path.resolve(import.meta.dirname, '..');

const creds = JSON.parse(
  await readFile(path.join(homedir(), '.config/devin/secrets/ea_demo_creds.json'), 'utf8'),
);
const USER = 'demo_hs';
const PIN = creds.pins.demo_hs;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

// ── Feature graphic 1024x500 ──────────────────────────────────
if (MODE === 'all' || MODE === 'graphic-only') {
  const land = (await readFile(path.join(ROOT, 'public/images/lands/land-brand.webp'))).toString('base64');
  const icon = (await readFile(path.join(ROOT, 'public/icon-512.png'))).toString('base64');
  const baloo = (await readFile(path.join(ROOT, 'public/fonts/baloo-2/baloo-2-latin-800-normal.woff2'))).toString('base64');
  const bvpro = (await readFile(path.join(ROOT, 'public/fonts/bevietnam-pro/bevietnam-pro-vietnamese-700.woff2'))).toString('base64');
  const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:'Baloo 2';src:url(data:font/woff2;base64,${baloo}) format('woff2');font-weight:800}
@font-face{font-family:'Be Vietnam Pro';src:url(data:font/woff2;base64,${bvpro}) format('woff2');font-weight:700}
*{margin:0;box-sizing:border-box}
body{width:1024px;height:500px;position:relative;overflow:hidden;font-family:'Baloo 2',sans-serif}
.bg{position:absolute;inset:0;width:1024px;height:1024px;object-fit:cover;object-position:50% 34%;top:-190px}
.shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(16,14,46,.72) 0%,rgba(16,14,46,.28) 46%,rgba(16,14,46,0) 72%)}
.row{position:absolute;left:64px;top:0;height:500px;display:flex;align-items:center;gap:36px}
.pig{width:196px;height:196px;border-radius:48px;box-shadow:0 18px 48px rgba(0,0,0,.45)}
.t1{font-size:76px;font-weight:800;color:#fff;letter-spacing:.5px;line-height:1.05;text-shadow:0 4px 24px rgba(0,0,0,.55)}
.t2{font-family:'Be Vietnam Pro',sans-serif;font-size:34px;font-weight:700;color:#ffd98a;margin-top:14px;text-shadow:0 3px 16px rgba(0,0,0,.6)}
.badge{display:inline-block;font-family:'Be Vietnam Pro',sans-serif;font-size:24px;color:#cfe6ff;background:rgba(64,110,255,.30);border:1px solid rgba(160,190,255,.45);border-radius:999px;padding:6px 18px;margin-top:22px}
</style>
<img class="bg" src="data:image/webp;base64,${land}">
<div class="shade"></div>
<div class="row">
  <img class="pig" src="data:image/png;base64,${icon}">
  <div>
    <div class="t1">English Arena</div>
    <div class="t2">VieSchool · Luyện tiếng Anh tiểu học</div>
    <div class="badge">Global Success · Lớp 1-5</div>
  </div>
</div>`;
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, 'feature-graphic.png') });
  await page.close();
  console.log('shot: feature-graphic');
}

if (MODE === 'graphic-only') {
  await browser.close();
  console.log('Done ->', OUT);
  process.exit(0);
}

// ── Phone screenshots 1080x2400 ───────────────────────────────
const page = await browser.newPage({
  viewport: { width: 540, height: 1200 },
  deviceScaleFactor: 2,
});

const shot = async (name) => {
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log('shot:', name);
};

const gotoRetry = async (url = BASE) => {
  for (let i = 0; i < 4; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3500);
      return;
    } catch (e) {
      console.warn(`goto retry ${i + 1}: ${String(e).slice(0, 100)}`);
      await page.waitForTimeout(4000);
    }
  }
  throw new Error(`cannot load ${url}`);
};

const tryClick = async (sel, timeout = 20000) => {
  try {
    const el = page.locator(sel).first();
    await el.waitFor({ state: 'visible', timeout });
    await el.click();
    return true;
  } catch (e) {
    console.warn(`click fail ${sel}: ${String(e).slice(0, 100)}`);
    return false;
  }
};

await gotoRetry();
await shot('01-entry');

// 2. Guest home / grade map — the map view is the app's main surface
await tryClick('[data-testid="guest-button"]');
await page.waitForTimeout(2500);
await shot('02-home');

// 3. Practice question surface (guest practice is allowed without login)
await tryClick('[data-testid="grade-card-grade-4"]');
await page.waitForTimeout(1500);
await tryClick('[data-testid="start-batch-button"]');
await page.waitForTimeout(3500);
await shot('03-practice');

// 4. Parent report — logged-in demo student shows real progress data
await gotoRetry();
await page.fill('[data-testid="login-username"]', USER);
await page.fill('[data-testid="login-pin"]', PIN);
await tryClick('[data-testid="login-submit"]');
try {
  await page.locator('[data-testid="grade-card-grade-4"]').waitFor({ state: 'visible', timeout: 60000 });
} catch {
  console.warn('login did not reach grade select in 60s');
}
await tryClick('[data-testid="open-parent-report"]', 30000);
await page.waitForTimeout(2500);
// Parental gate: solve the VN math challenge to reach the real report.
// Clicks must be scoped inside the dialog — digits also exist on the map behind.
try {
  const gate = page.locator('[data-testid="parent-gate"]');
  const q = await gate.locator('text=nhân').first().textContent({ timeout: 5000 });
  const NUM = { 'một':1,'hai':2,'ba':3,'bốn':4,'năm':5,'sáu':6,'bảy':7,'tám':8,'chín':9,'mười':10 };
  const m = q?.match(/(\S+)\s+nhân\s+(\S+)/i);
  if (m) {
    const ans = String((NUM[m[1].toLowerCase()] ?? 0) * (NUM[m[2].toLowerCase()] ?? 0));
    for (const d of ans) {
      await gate.getByText(d, { exact: true }).last().click();
      await page.waitForTimeout(250);
    }
    await gate.getByText('OK', { exact: true }).first().click();
  }
} catch (e) {
  console.warn('parental gate skip:', String(e).slice(0, 80));
}
await page.waitForTimeout(4000);
await shot('04-report');

await browser.close();
console.log('Done ->', OUT);
