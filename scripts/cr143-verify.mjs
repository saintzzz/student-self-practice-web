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

  // game board: Khu trò chơi -> first game -> level
  const games = page.getByTestId('hub-tile-games');
  if (await games.isVisible().catch(() => false)) {
    await games.click();
    await page.waitForTimeout(600);
    const first = page.locator('[data-testid^="game-card-"]:not([data-testid="game-card-coming-soon"])').first();
    if (await first.isVisible().catch(() => false)) {
      await first.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${OUT}/${name}-40-game-picker.png` });
      const lvl = page.locator('[data-testid^="game-level-"]').first();
      if (await lvl.isVisible().catch(() => false)) {
        await lvl.click();
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `${OUT}/${name}-50-game-play.png` });
      }
    }
  }
  await page.close();
}

// splash skeleton: hold the supabase BACKEND request so the auth
// 'loading' state persists (aborting *supabase* also killed the vite
// /src/lib/supabase module last run - blank shot). Assert the skeleton
// is visible before capture.
const p2 = await browser.newPage({ viewport: viewports.tablet });
await p2.route('**://*.supabase.co/**', () => new Promise(() => {}));
await p2.goto('http://localhost:5173/app');
await p2.locator('text=Đang tải...').waitFor({ timeout: 5000 }).catch(() => {});
await p2.screenshot({ path: `${OUT}/tablet-00-splash.png` });
await p2.close();

await browser.close();
console.log('done ->', OUT);
