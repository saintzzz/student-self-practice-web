// CR-142 Designer pass: capture every Class Show phase at projector + tablet.
import { chromium } from 'playwright';

const ROSTER = 'Minh Anh, Bảo Nam, Khánh Linh, Gia Huy, Ngọc Diệp, Quốc Bảo, Thu Hà, An Nhiên, Tuấn Kiệt, Mỹ Linh, Đức Anh, Phương Thảo';

async function run(browser, W, H, tag) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const shot = (n) => page.screenshot({ path: `_shots/design-pass/${tag}-${n}.png`, fullPage: false });
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.getByTestId('guest-button').click();
  await page.getByTestId('grade-card-grade-3').click();
  await page.getByTestId('hub-tile-arena').click();
  await page.getByTestId('class-show-open').click();
  await page.locator('[data-testid="show-roster"]').fill(ROSTER);
  await page.waitForTimeout(600); // let screen-enter animation settle
  await shot('01-setup');
  await page.getByTestId('show-start').click();
  await page.waitForSelector('[data-testid="show-spotlight"]');
  await page.waitForTimeout(300); // mid-spin spotlight
  await shot('02-spotlight');
  await page.waitForSelector('[data-testid="show-question"]', { timeout: 30000 });
  await shot('03-question');
  await page.getByTestId('show-reveal-btn').click();
  await shot('04-revealed');
  // steal: wrong before reveal on next question
  await page.waitForSelector('[data-testid="show-correct"]', { timeout: 10000 });
  await page.getByTestId('show-correct').click();
  await page.waitForSelector('[data-testid="show-question"]', { timeout: 30000 });
  await page.getByTestId('show-wrong').click(); // pre-reveal steal
  await page.waitForSelector('[data-testid="show-question"]', { timeout: 30000 });
  await shot('05-steal');
  // finish remaining questions fast
  for (let i = 0; i < 8; i++) {
    const done = await page.locator('[data-testid="show-again"]').count();
    if (done) break;
    const rb = await page.locator('[data-testid="show-reveal-btn"]').count();
    if (rb) await page.getByTestId('show-reveal-btn').click();
    const cb = await page.locator('[data-testid="show-correct"]').count();
    if (cb) await page.getByTestId('show-correct').click();
    await page.waitForTimeout(1700);
  }
  await page.waitForSelector('[data-testid="show-again"]', { timeout: 30000 });
  await shot('06-podium');
  await page.close();
}

const browser = await chromium.launch();
await run(browser, 1440, 900, 'projector');
await run(browser, 768, 1024, 'tablet');
await browser.close();
console.log('DONE');
