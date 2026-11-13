// Drives the user's logged-in Play Console session (copied profile at
// /tmp/ea-chrome-prof) to inspect EA release state. Read-only probe:
// navigates app dashboard + testing + production pages and dumps text.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const OUT = path.resolve(import.meta.dirname, '../_shots/console');
await mkdir(OUT, { recursive: true });

const ctx = await chromium.launchPersistentContext('/tmp/ea-chrome-prof', {
  channel: 'chrome',
  headless: false,
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = ctx.pages()[0] || await ctx.newPage();

const dump = async (name) => {
  const txt = await page.evaluate(() => document.body.innerText);
  console.log(`\n===== ${name} | ${page.url()} =====`);
  console.log(txt.slice(0, 4500));
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
};

await page.goto(
  'https://play.google.com/console/u/0/developers/9000336336756902041/home',
  { waitUntil: 'domcontentloaded', timeout: 90000 },
);
await page.waitForTimeout(7000);

// Enter the app
await page.getByText('English Arena').first().click();
await page.waitForTimeout(8000);
await dump('app-dashboard');

// Sidebar nav links (Vietnamese console labels) -> click each and dump
for (const [label, name] of [
  ['Kiểm thử kín', 'closed-testing'],
  ['Kiểm thử nội bộ', 'internal-testing'],
  ['Kiểm thử công khai', 'open-testing'],
  ['Sản xuất', 'production'],
  ['Nội dung ứng dụng', 'app-content'],
]) {
  try {
    const link = page.getByRole('link', { name: new RegExp(label) }).first();
    if (await link.isVisible({ timeout: 5000 })) {
      await link.click();
      await page.waitForTimeout(6000);
      await dump(name);
    } else {
      console.log(`NAV MISS: ${label}`);
    }
  } catch (e) {
    console.log(`NAV FAIL ${label}: ${String(e).slice(0, 100)}`);
  }
}

console.log('\nDONE');
await ctx.close();
