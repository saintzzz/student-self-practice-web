/* _report-verify.mjs - parent report renders as a light report sheet on
 * the navy shell (no more full-page sky-50). Solves the real ParentGate
 * arithmetic challenge to get in. */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

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

  /* The navy shell must show around the sheet. Walk up from the hit
     element to the first OPAQUE background - a transparent wrapper must
     not read as rgba(0,0,0,0)->black (r75). */
  const probe = await page.evaluate(() => {
    const rgbLum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
    let el = document.elementFromPoint(8, Math.floor(window.innerHeight / 2));
    while (el) {
      const cs = getComputedStyle(el);
      /* LandShell paints navy as a background-image gradient over the
         bg-color - image wins the painted surface, check it first. */
      const gi = cs.backgroundImage;
      if (gi && gi !== 'none') {
        const s = gi.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/) ?? gi.match(/#([0-9a-f]{6})/i);
        if (s) {
          const [r, g, b] = s[0][0] === '#'
            ? [parseInt(s[1].slice(0, 2), 16), parseInt(s[1].slice(2, 4), 16), parseInt(s[1].slice(4, 6), 16)]
            : [+s[1], +s[2], +s[3]];
          return { lum: rgbLum(r, g, b), hit: `${el.tagName}.${String(el.className).slice(0, 60)} (gradient)` };
        }
      }
      const m = cs.backgroundColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if (m && Number(m[4] ?? 1) > 0) {
        return {
          lum: rgbLum(+m[1], +m[2], +m[3]),
          hit: `${el.tagName}.${String(el.className).slice(0, 60)}`,
        };
      }
      el = el.parentElement;
    }
    return { lum: 255, hit: 'none' };
  });
  ok = probe.lum < 120;
  console.log(`${ok ? 'ok' : 'FAIL'} page-edge luminance ${probe.lum.toFixed(0)} @ ${probe.hit} (navy shell visible)`);
  await page.screenshot({ path: 'shots/_report-after.png', fullPage: false });
} finally {
  await browser.close();
}
process.exit(ok ? 0 : 1);
