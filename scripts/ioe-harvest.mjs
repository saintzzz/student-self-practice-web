/**
 * CR-26 research tool - harvests full exam payloads from ioe.vn Thi thử.
 *
 * Each exam entry calls POST /ioe-service/v2/thithu/getinfo which returns
 * the complete 200-question payload (prompts, options, image/audio CDN
 * URLs). Correct answers are recoverable inside the payload:
 *   - type 10 (MCQ):    option with the lowest `orderTrue` is correct
 *   - type 5 (reorder): sort `ans` tiles by `orderTrue` -> full sentence
 *   - type 2 (fill-in): masked word; `g.ans` carries a partial key -
 *     residual questions are solved from mask + numTChar + context
 *   - type 1 (T/F):     statement + passage; solve by reading
 *
 * Usage (manual login once, then harvest):
 *   IOE_STORAGE=docs/research/ioe/storage.json node scripts/ioe-harvest.mjs
 *
 * The script opens ioe.vn; if a login is needed it pauses 90s for the
 * operator to complete it in the visible window, then loops the four
 * competition levels for `--runs` iterations, dumping every distinct
 * getinfo payload to docs/research/ioe/dumps/.
 *
 * NOTE: content is IOE's proprietary bank - use for calibration/
 * authoring reference, do not ship verbatim.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const RUNS = Number(process.env.HARVEST_RUNS ?? 2);
const OUT_DIR = 'docs/research/ioe/dumps';
const STORAGE = process.env.IOE_STORAGE ?? 'docs/research/ioe/storage.json';
const LEVELS = [1, 2, 3, 4]; // Truong / Phuong-Xa / Tinh / Quoc gia

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: false });
const ctx = await browser.newContext(existsSync(STORAGE) ? { storageState: STORAGE } : {});
const page = await ctx.newPage();

const captured = [];
page.on('response', async (res) => {
  if (!res.url().includes('/thithu/getinfo')) return;
  try {
    const text = await res.text();
    const hash = createHash('sha1').update(text).digest('hex').slice(0, 10);
    if (captured.some((c) => c.hash === hash)) return;
    captured.push({ hash, text });
    writeFileSync(`${OUT_DIR}/getinfo-${hash}.json`, text);
    console.log(`[capture] saved getinfo-${hash}.json (${text.length}B)`);
  } catch { /* ignore */ }
});

await page.goto('https://ioe.vn/hoc-sinh/thi-thu');
// Give the operator a window to log in if storage state is cold.
const loggedIn = await page
  .waitForSelector('text=Vào thi ngay', { timeout: 90000 })
  .then(() => true)
  .catch(() => false);
if (!loggedIn) {
  console.log('Login not detected - complete login then re-run.');
  await ctx.storageState({ path: STORAGE });
  await browser.close();
  process.exit(1);
}
await ctx.storageState({ path: STORAGE });

for (let run = 0; run < RUNS; run++) {
  for (const level of LEVELS) {
    // Click the i-th "Vào thi ngay" (level order matches card order).
    const btns = page.locator('text=Vào thi ngay');
    if ((await btns.count()) < level) continue;
    await btns.nth(level - 1).click();
    // getinfo fires on exam load; wait briefly then exit the room.
    await page.waitForTimeout(8000);
    const exit = page.locator('text=Thoát');
    if (await exit.count()) await exit.first().click();
    await page.goto('https://ioe.vn/hoc-sinh/thi-thu');
    await page.waitForTimeout(2000);
  }
}

await ctx.storageState({ path: STORAGE });
await browser.close();
console.log(`done - ${captured.length} distinct exams dumped to ${OUT_DIR}`);
