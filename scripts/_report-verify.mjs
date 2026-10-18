/* _report-verify.mjs - parent report renders as a light report sheet on
 * the navy shell (no more full-page sky-50). Solves the real ParentGate
 * arithmetic challenge to get in. */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5199';
mkdirSync('shots', { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 480, height: 900 } });
let ok = true;
try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('open-parent-report').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('open-parent-report').click();
  await page.getByTestId('parent-gate-question').waitFor({ state: 'visible' });
  const q = await page.getByTestId('parent-gate-question').innerText();
  const NUM = { không: 0, một: 1, mốt: 1, hai: 2, ba: 3, bốn: 4, tư: 4, năm: 5, lăm: 5, sáu: 6, bảy: 7, bẩy: 7, tám: 8, chín: 9, mười: 10 };
  const toNum = (tok) => {
    const t = tok.toLowerCase().replace(/[?.,!]/g, '');
    if (/^\d+$/.test(t)) return Number(t);
    if (t in NUM) return NUM[t];
    const m10 = t.match(/^mười(\w+)$/); // mườimột..mườichín unlikely but safe
    if (m10 && m10[1] in NUM) return 10 + NUM[m10[1]];
    return null;
  };
  const toks = q.split(/\s+/);
  const nums = toks.map(toNum).filter((n) => n !== null);
  if (nums.length < 2) throw new Error(`gate question unparsable: ${q}`);
  const answer = String(nums[0] * nums[1]);
  console.log('gate:', q, '->', answer);
  for (const ch of answer) await page.getByTestId(`parent-gate-key-${ch}`).click();
  await page.getByTestId('parent-gate-ok').click();
  await page.getByTestId('report-back').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);

  /* The navy shell must show around the sheet: sample the RENDERED
     pixel at the left page edge (r75/r76 - CSS walking can't decide
     translucent layers or gradient stops). */
  const edge = await page.screenshot({
    clip: { x: 0, y: Math.floor((await page.viewportSize()).height / 2) - 4, width: 10, height: 8 },
  });
  writeFileSync('shots/_report-edge.png', edge);
  const out = execFileSync('python', [
    '-c',
    "from PIL import Image; im=Image.open('shots/_report-edge.png').convert('RGB'); px=[im.getpixel((x,y)) for x in range(10) for y in range(8)]; print(round(sum(0.299*p[0]+0.587*p[1]+0.114*p[2] for p in px)/len(px),1))",
  ], { encoding: 'utf8' }).trim();
  const lum = Number(out);
  ok = Number.isFinite(lum) && lum < 120;
  console.log(`${ok ? 'ok' : 'FAIL'} page-edge luminance ${lum} (navy shell visible)`);
  await page.screenshot({ path: 'shots/_report-after.png', fullPage: false });
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
