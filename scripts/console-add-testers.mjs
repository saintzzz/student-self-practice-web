// Add emails to the 'testers' email list on the alpha closed track, then save.
// Usage: node scripts/console-add-testers.mjs a@gmail.com b@gmail.com ...
//        node scripts/console-add-testers.mjs --file emails.txt   (one email per line)
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
let emails = [];
if (args[0] === '--file') {
  emails = readFileSync(args[1], 'utf8')
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter((s) => s.includes('@'));
} else {
  emails = args;
}
if (!emails.length) {
  console.error('usage: node scripts/console-add-testers.mjs <email...> | --file emails.txt');
  process.exit(1);
}
console.log('adding', emails.length, 'emails:', emails.join(', '));

const TRACK =
  'https://play.google.com/console/u/0/developers/9000336336756902041/app/4975805123872991253/tracks/4701179092073316425?tab=testers';

const ctx = await chromium.launchPersistentContext('/tmp/ea-chrome-prof', {
  channel: 'chrome',
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto(TRACK, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);

// Open the testers list editor: DOM-click the BUTTON in the row action cell
const clicked = await page.evaluate(() => {
  const icons = [...document.querySelectorAll('i')].filter(
    (e) => e.innerText.trim() === 'arrow_right_alt' && e.offsetParent,
  );
  const i = icons[icons.length - 1];
  if (!i) return false;
  let n = i;
  while (n && n.tagName !== 'BUTTON') n = n.parentElement;
  (n || i).click();
  return true;
});
if (!clicked) {
  console.error('could not find list edit button');
  await ctx.close();
  process.exit(1);
}
await page.waitForTimeout(6000);

// Fill the "Thêm các địa chỉ email" input with comma-separated emails, Enter
const input = page
  .locator('input[type="text"], textarea')
  .filter({ hasText: /.*/ })
  .last();
// safer: find input inside the dialog near the label 'Thêm các địa chỉ email'
const dialog = page.locator('div:has-text("Đã thêm địa chỉ email")').last();
const field = dialog.locator('input, textarea').first();
await field.click();
await field.fill(emails.join(','));
await field.press('Enter');
await page.waitForTimeout(2000);

// Save changes in dialog
await page.getByText('Lưu thay đổi').first().click();
await page.waitForTimeout(4000);
// Save the track testers form
await page.getByRole('button', { name: 'Lưu' }).first().click().catch(async () => {
  await page.getByText(/^Lưu$/).first().click();
});
await page.waitForTimeout(6000);

const txt = await page.evaluate(() => document.body.innerText);
const found = txt.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [];
console.log('emails now visible on page:', found.length);
console.log('DONE');
await ctx.close();
