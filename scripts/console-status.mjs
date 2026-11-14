// Probe Play Console - dump all setup pages for English Arena.
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
const page = ctx.pages()[0] || (await ctx.newPage());

const dump = async (name, n = 6000) => {
  const txt = await page.evaluate(() => document.body.innerText);
  console.log(`\n===== ${name} | ${page.url()} =====`);
  console.log(txt.slice(0, n));
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
};

const base =
  'https://play.google.com/console/u/0/developers/9000336336756902041/app/4975805123872991253';

const targets = [
  ['dashboard', `${base}/app-dashboard`],
  ['setup-checklist', `${base}/setup`],
  ['releases-dashboard', `${base}/releases-dashboard`],
  ['production', `${base}/tracks/production`],
  ['closed-alpha', `${base}/tracks/alpha`],
  ['internal-track', `${base}/tracks/internal-testing`],
  ['main-store-listing', `${base}/main-store-listing`],
  ['store-settings', `${base}/store-settings`],
  ['app-content', `${base}/app-content`],
  ['policy-status', `${base}/policy-status`],
];
for (const [name, url] of targets) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(6000);
    await dump(name);
  } catch (e) {
    console.log(`\n===== ${name} FAIL: ${String(e).slice(0, 120)}`);
  }
}

console.log('\nDONE');
await ctx.close();
