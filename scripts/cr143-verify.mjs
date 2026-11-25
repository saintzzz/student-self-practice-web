// CR-143 verification: capture the changed surfaces at the 3 audit
// viewports - grade-select rows, hub 2-col, learn drawer cards,
// game board fill, round summary, splash skeleton.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const OUT = '_shots/cr143';
mkdirSync(OUT, { recursive: true });

const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  phone: { width: 390, height: 844 },
};

const browser = await chromium.launch();
for (const [name, vp] of Object.entries(viewports)) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto('http://localhost:5173/app', { waitUntil: 'networkidle' });
  // guest flow -> grade select
  const guest = page.getByTestId('guest-button');
  if (await guest.isVisible({ timeout: 8000 }).catch(() => false)) await guest.click();
  await page.getByTestId('grade-card-grade-3').waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${OUT}/${name}-10-gradeselect.png` });

  await page.getByTestId('grade-card-grade-3').click();
  await page.getByTestId('start-batch-button').waitFor({ timeout: 10000 });
  await page.screenshot({ path: `${OUT}/${name}-20-hub.png` });

  // learn drawer -> mode cards
  const learn = page.getByTestId('hub-tile-learn');
  if (await learn.isVisible().catch(() => false)) {
    await learn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}/${name}-30-learn-cards.png` });
  }

  // game board: Khu trò chơi -> first game -> level. r216: fail loudly
  // instead of silently skipping - a pass without picker/play evidence
  // is a false green.
  const games = page.getByTestId('hub-tile-games');
  await games.scrollIntoViewIfNeeded();
  await games.click();
  await page.waitForTimeout(600);
  const first = page.locator('[data-testid^="game-card-"]:not([data-testid="game-card-coming-soon"])').first();
  await first.waitFor({ timeout: 8000 });
  await first.click();
  await page.getByTestId('game-level-picker').waitFor({ timeout: 8000 });
  await page.screenshot({ path: `${OUT}/${name}-40-game-picker.png` });
  // r217: the picker's first button is the decorative game-art-pet -
  // click the explicit level-1 control and prove gameplay mounted
  // (picker detaches) before capturing.
  await page.getByTestId('game-level-1').click();
  await page.getByTestId('game-level-picker').waitFor({ state: 'detached', timeout: 8000 });
  await page.screenshot({ path: `${OUT}/${name}-50-game-play.png` });
  await page.close();
}

// splash skeleton (r217): getSession() resolves locally without a
// session - so seed an EXPIRED session, which forces a network token
// refresh, then hold that one endpoint. Auth 'loading' now persists
// deterministically instead of racing the screenshot.
const p2 = await browser.newPage({ viewport: viewports.tablet });
await p2.addInitScript(() => {
  window.localStorage.setItem('sb-cxjpgfhqchjoernfmcra-auth-token', JSON.stringify({
    access_token: 'ea-verify-expired',
    refresh_token: 'ea-verify-held',
    token_type: 'bearer',
    expires_at: 1,
    expires_in: 3600,
    user: { id: 'ea-verify', aud: 'authenticated', role: 'authenticated' },
  }));
});
await p2.route('**/auth/v1/token**', () => new Promise(() => {}));
// r219: register the request wait BEFORE goto - a refresh fired during
// navigation would otherwise be missed (flaky timeout on a healthy app).
const refreshFired = p2.waitForRequest('**/auth/v1/token**', { timeout: 20000 });
await p2.goto('http://localhost:5173/app');
// r218: prove the seeded session actually fired the held refresh -
// only then is the visible splash the auth skeleton, not a transient
// lazy-route fallback.
await refreshFired;
await p2.locator('text=Đang tải...').waitFor({ timeout: 8000 });
await p2.screenshot({ path: `${OUT}/tablet-00-splash.png` });
await p2.close();

await browser.close();
console.log('done ->', OUT);
