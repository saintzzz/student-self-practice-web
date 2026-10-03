import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://ea.vieschool.com/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await page.locator('button:has-text("Chơi không cần tài khoản")').click();
await page.waitForTimeout(3000);
await page.locator('button:has-text("4")').first().click();
await page.waitForTimeout(3000);
console.log('quest card:', await page.locator('[data-testid="daily-quest-card"]').count());
console.log('review card (expect 0 - nothing wrong yet):', await page.locator('[data-testid="review-card"]').count());
// Play a drill, answer wrong once, quit -> review should appear tomorrow, not now
await page.locator('[data-testid="drill-english"]').click();
await page.waitForTimeout(2000);
await page.locator('[data-testid="exam-begin"]').click();
await page.waitForTimeout(2000);
// answer first question with first option (unknown correctness)
await page.locator('[data-testid="exam-option-0"]').click();
await page.waitForTimeout(1500);
const verdict = await page.locator('[data-testid="practice-verdict"]').innerText().catch(()=>'');
console.log('verdict shown:', verdict.slice(0, 60));
await browser.close();
