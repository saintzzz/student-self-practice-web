// CR-143 design audit: capture the whole student journey at kid-device sizes.
import { chromium } from 'playwright';

const tag = process.argv[2] || 'audit';
const out = (n) => `_shots/ux-audit/${tag}-${n}.png`;

async function run(browser, W, H, size) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${String(e).slice(0, 160)}`));
  const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: out(`${size}-${n}`) }); };

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await shot('01-login');

  if (await page.getByTestId('guest-button').count()) {
    await page.getByTestId('guest-button').click();
    await page.waitForTimeout(800);
  }
  await shot('02-grade-select');

  if (await page.getByTestId('grade-card-grade-3').count()) {
    await page.getByTestId('grade-card-grade-3').click();
    await page.waitForTimeout(1200);
  }
  await shot('03-hub');
  await shot('03b-hub-scrolled').catch?.(() => {});
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
  await page.waitForTimeout(400);
  await shot('03b-hub-mid');
  await page.evaluate(() => window.scrollTo(0, 0));

  // Practice batch: open via start-batch-button
  if (await page.getByTestId('start-batch-button').count()) {
    await page.getByTestId('start-batch-button').click();
    await page.waitForTimeout(1500);
    await shot('04-batch-q1');
    // walk 3 questions capturing variety: pick first enabled option, then next
    for (let i = 0; i < 3; i++) {
      const opt = page.locator('[data-testid^="option-"]:not([disabled])').first();
      if (!(await opt.count())) break;
      await opt.click();
      await page.waitForTimeout(900);
      await shot(`04-batch-q${i + 2}-feedback`);
      const next = page.getByTestId('next-button');
      if (await next.count()) { await next.click(); await page.waitForTimeout(900); await shot(`04-batch-q${i + 3}`); }
      else break;
    }
  }

  // back to hub for arena / games / flashcards
  const back = page.locator('button:has-text("Quay lại"), button:has-text("←")').first();
  if (await back.count()) { await back.click(); await page.waitForTimeout(800); }

  if (await page.getByTestId('flashcards-start').count()) {
    await page.getByTestId('flashcards-start').click();
    await page.waitForTimeout(1200);
    await shot('05-flashcards');
    const b2 = page.locator('button:has-text("Quay lại")').first();
    if (await b2.count()) { await b2.click(); await page.waitForTimeout(700); }
  }

  if (await page.getByTestId('hub-tile-arena').count()) {
    await page.getByTestId('hub-tile-arena').click();
    await page.waitForTimeout(1000);
    await shot('06-arena');
  }

  // game entry: look for a game card on the hub
  const gameCard = page.locator('[data-testid^="game-card-"], [data-testid^="hub-tile-"]').first();
  if (await gameCard.count() && !(await page.getByTestId('hub-tile-arena').count())) {
    await gameCard.click(); await page.waitForTimeout(900); await shot('07-game');
  }

  if (errors.length) console.log(`[${size}] CONSOLE ERRORS:\n  ${errors.join('\n  ')}`);
  await page.close();
}

const browser = await chromium.launch();
await run(browser, 768, 1024, 'tablet');
await run(browser, 390, 844, 'phone');
await run(browser, 1440, 900, 'desktop');
await browser.close();
console.log('DONE');
