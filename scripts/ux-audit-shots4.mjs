// CR-143 audit pass 4: round summary (finish a batch) + exam intro.
import { chromium } from 'playwright';
const out = (n) => `_shots/ux-audit/p4-${n}.png`;

async function run(browser, W, H, size) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const shot = async (n) => { await page.waitForTimeout(400); await page.screenshot({ path: out(`${size}-${n}`) }); };
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.getByTestId('guest-button').click();
  await page.getByTestId('grade-card-grade-3').click();
  await page.waitForTimeout(1000);

  await page.getByTestId('start-batch-button').click();
  await page.waitForTimeout(1500);
  for (let i = 0; i < 30; i++) {
    if (await page.getByTestId('round-done').count()) break;
    // games inside the round may appear - skip if needed
    if (await page.getByTestId('game-section-skip').count()) {
      await page.getByTestId('game-section-skip').click().catch(() => {});
      await page.waitForTimeout(800); continue;
    }
    const opt = page.locator('[data-testid^="option-"]:not([disabled]), [data-testid^="choice-"]:not([disabled])').first();
    if (await opt.count()) await opt.click().catch(() => {});
    await page.waitForTimeout(700);
    if (await page.getByTestId('round-done').count()) break;
    const next = page.getByTestId('next-button');
    if (await next.count()) await next.click().catch(() => {});
    await page.waitForTimeout(700);
    if (await page.getByTestId('next-round-button').count()) {
      await page.getByTestId('next-round-button').click().catch(() => {});
      await page.waitForTimeout(1000);
    }
  }
  await shot('30-round-end');
  await page.close();
}

const browser = await chromium.launch();
await run(browser, 768, 1024, 'tablet');
await run(browser, 390, 844, 'phone');
await browser.close();
console.log('DONE');
