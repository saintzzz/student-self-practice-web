/* _game-exit-verify.mjs - "Quay lai khu tro choi" must land on the hub
 * with the games tile expanded (bug: it used to remount the bare
 * launchpad). Covers both exits: header arrow mid-run and the end
 * screen's "Khu tro choi" button. */
import { chromium } from 'playwright';

const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:5199';
const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok, extra });
  console.log(`${ok ? 'ok' : 'FAIL'} ${name}${extra ? ` - ${extra}` : ''}`);
};

const browser = await chromium.launch();
const page = await browser.newPage();
try {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('grade-card-grade-1').click();
  await page.getByTestId('hub-tile-games').waitFor({ state: 'visible' });

  /* Case 1: header arrow mid-level-picker. */
  await page.getByTestId('hub-tile-games').click();
  await page.getByTestId('game-card-memory-match').click();
  await page.getByTestId('game-exit').waitFor({ state: 'visible' });
  await page.getByTestId('game-exit').click();
  await page.getByTestId('hub-tile-games').waitFor({ state: 'visible' });
  check(
    'header exit -> games tile expanded',
    (await page.getByTestId('hub-tile-games').getAttribute('aria-expanded')) === 'true',
  );
  check('header exit -> shelf mounted', await page.getByTestId('game-zone-shelf').isVisible());

  /* Case 2: end-screen "Khu tro choi" button. Drive a pool game to its
     end by clicking the live [data-correct] option until the award
     screen shows (same driver shape as e2e runGameRound). */
  await page.getByTestId('game-card-feed-the-pig').click();
  await page.getByTestId('game-level-1').click();
  const endScreen = page.getByTestId('game-end-screen');
  for (let i = 0; i < 140 && !(await endScreen.isVisible().catch(() => false)); i++) {
    /* DOM click - option elements move/disable mid-feedback and fail
       Playwright actionability, so e2e clicks them via evaluate. */
    await page.evaluate(() => {
      const el = document.querySelector('[data-correct="true"]:not([disabled])');
      if (el) el.click();
    });
    await page.waitForTimeout(450);
  }
  if (!(await endScreen.isVisible().catch(() => false))) {
    check('end screen reached', false, 'memory-match did not finish in attempts');
  } else {
    check('end screen reached', true);
    await page.getByTestId('game-exit-zone').click();
    await page.getByTestId('hub-tile-games').waitFor({ state: 'visible' });
    check(
      'end-screen exit -> games tile expanded',
      (await page.getByTestId('hub-tile-games').getAttribute('aria-expanded')) === 'true',
    );
    check('end-screen exit -> shelf mounted', await page.getByTestId('game-zone-shelf').isVisible());
  }
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(failed.length === 0 ? 'ALL OK' : `${failed.length} FAILURES`);
process.exit(failed.length === 0 ? 0 : 1);
