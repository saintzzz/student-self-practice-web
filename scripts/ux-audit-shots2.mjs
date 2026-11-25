// CR-143 design audit, pass 2: sections + exam + game + reward + summary.
import { chromium } from 'playwright';

const out = (n) => `_shots/ux-audit/p2-${n}.png`;

async function run(browser, W, H, size) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const shot = async (n) => { await page.waitForTimeout(350); await page.screenshot({ path: out(`${size}-${n}`) }); };
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.getByTestId('guest-button').click();
  await page.getByTestId('grade-card-grade-3').click();
  await page.waitForTimeout(1000);

  // Learn section (Luyện & thi)
  await page.getByTestId('hub-tile-learn').click().catch(() => {});
  await page.waitForTimeout(700);
  await shot('10-learn');
  // exam intro: first practice button inside learn panel
  const prac = page.locator('button:has-text("Luyện đề"), button:has-text("Làm đề"), button:has-text("Thi thử")').first();
  if (await prac.count()) { await prac.click().catch(() => {}); await page.waitForTimeout(1200); await shot('11-exam-intro'); }
  const begin = page.getByTestId('exam-begin');
  if (await begin.count()) { await begin.click(); await page.waitForTimeout(1500); await shot('12-exam-q1'); }
  // exit exam
  const endBtn = page.getByTestId('batch-end-early').or(page.locator('button:has-text("Kết thúc"), button:has-text("Thoát"), button:has-text("Quay lại")').first());
  if (await endBtn.count()) { await endBtn.first().click().catch(() => {}); await page.waitForTimeout(800); await shot('13-exit-confirm'); }
  const confirm = page.locator('button:has-text("Kết thúc"), button:has-text("Có"), button:has-text("Thoát")').first();
  if (await confirm.count()) { await confirm.click().catch(() => {}); await page.waitForTimeout(800); }

  // back to hub root if a section is open
  const hubBack = page.getByTestId('back-to-grades').or(page.locator('button:has-text("Quay lại")').first());
  if (!(await page.getByTestId('hub-tile-arena').count()) && await hubBack.count()) { await hubBack.first().click().catch(() => {}); await page.waitForTimeout(800); }
  if (await page.getByTestId('hub-tile-learn').count()) { /* still hub */ }

  // Games section
  await page.getByTestId('hub-tile-games').click().catch(() => {});
  await page.waitForTimeout(700);
  await shot('14-games');
  const gameCard = page.locator('[data-testid^="game-"], button:has-text("Lật thẻ"), button:has-text("Bóng bay"), button:has-text("Đua xe")').first();
  if (await gameCard.count()) { await gameCard.click().catch(() => {}); await page.waitForTimeout(1500); await shot('15-game-play'); }
  const back2 = page.locator('button:has-text("Quay lại")').first();
  if (await back2.count()) { await back2.click().catch(() => {}); await page.waitForTimeout(700); }

  // Arena section
  if (await page.getByTestId('hub-tile-arena').count()) {
    await page.getByTestId('hub-tile-arena').click().catch(() => {});
    await page.waitForTimeout(700);
    await shot('16-arena');
  }

  // Reward section
  const rew = page.getByTestId('hub-tile-reward');
  if (await rew.count()) { await rew.click().catch(() => {}); await page.waitForTimeout(700); await shot('17-reward'); }

  await page.close();
}

const browser = await chromium.launch();
await run(browser, 768, 1024, 'tablet');
await run(browser, 1440, 900, 'desktop');
await browser.close();
console.log('DONE');
