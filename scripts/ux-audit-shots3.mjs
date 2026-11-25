// CR-143 audit pass 3: games shelf + game play + round summary + exam q.
import { chromium } from 'playwright';

const out = (n) => `_shots/ux-audit/p3-${n}.png`;

async function run(browser, W, H, size) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const shot = async (n) => { await page.waitForTimeout(400); await page.screenshot({ path: out(`${size}-${n}`) }); };
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.getByTestId('guest-button').click();
  await page.getByTestId('grade-card-grade-3').click();
  await page.waitForTimeout(1000);

  // Games shelf
  await page.getByTestId('hub-tile-games').click().catch(() => {});
  await page.waitForTimeout(800);
  await shot('20-games-shelf');
  // play featured game
  const gc = page.locator('[data-testid^="game-card-"]:not([data-testid="game-card-coming-soon"])').first();
  if (await gc.count()) {
    await gc.click().catch(() => {});
    await page.waitForTimeout(1500);
    await shot('21-game-entry');
    const lvl = page.locator('[data-testid^="game-level-"]').first();
    if (await lvl.count()) { await lvl.click().catch(() => {}); await page.waitForTimeout(1500); await shot('22-game-play'); }
  }
  const back = page.locator('button:has-text("Quay lại")').first();
  if (await back.count()) { await back.click().catch(() => {}); await page.waitForTimeout(700); }

  // Round summary: run the 10-question batch quickly
  if (await page.getByTestId('start-batch-button').count()) {
    await page.getByTestId('start-batch-button').click();
    await page.waitForTimeout(1500);
    for (let i = 0; i < 14; i++) {
      if (await page.getByTestId('round-done').count()) break;
      const opt = page.locator('[data-testid^="option-"]:not([disabled])').first();
      if (await opt.count()) await opt.click().catch(() => {});
      await page.waitForTimeout(700);
      const next = page.getByTestId('next-button');
      if (await next.count()) await next.click().catch(() => {});
      await page.waitForTimeout(800);
    }
    if (await page.getByTestId('round-done').count()) await shot('23-round-summary');
    else await shot('23-round-mid');
  }

  await page.close();
}

const browser = await chromium.launch();
await run(browser, 768, 1024, 'tablet');
await run(browser, 390, 844, 'phone');
await browser.close();
console.log('DONE');
