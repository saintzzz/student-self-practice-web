// CR-110 messenger lane: send first-touch via Facebook page inbox.
// Session: secrets/fb-profile persistent context (user logs in once).
//   node scripts/gtm/messenger.mjs [--limit 8] [--dry]
// FB page URL: lead.website if it's a facebook link, else scrape website
// for a facebook.com/<page> href. Slow + low cap - FB bans aggressively.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { arg, hasFlag } from './lib.mjs';

const HOME = process.env.HOME ?? process.env.USERPROFILE;
const SEC = join(HOME ?? '', '.config/devin/secrets');
const { url, keys } = JSON.parse(readFileSync(join(SEC, 'supabase_new_keys.json'), 'utf8'));
const gtm = createClient(url, keys.service_role, { auth: { persistSession: false } });
const LIMIT = Number(arg('--limit', 500));
const GAP_MS = 60e3;

const MSG = () =>
  `Chào anh/chị, em bên VieSchool - hệ sinh thái số cho trường tiểu học: English Arena (99.000+ câu hỏi SGK Global Success, đề thi IOE, 15 trò chơi), Công cụ soạn đề giáo viên (ma trận, xuất Word/PDF), Sổ chủ nhiệm điện tử. Anh/chị có 5 phút để em giới thiệu không ạ? https://vieschool.com`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FB_RE = /https?:\/\/(?:www\.)?facebook\.com\/[A-Za-z0-9.\-_]+/;

const findFbUrl = async (lead, page) => {
  if (FB_RE.test(lead.website ?? '')) return lead.website.match(FB_RE)[0];
  if (!lead.website) return null;
  try {
    const r = await fetch(lead.website.startsWith('http') ? lead.website : `https://${lead.website}`,
      { signal: AbortSignal.timeout(10000), redirect: 'follow' });
    return (await r.text()).match(FB_RE)?.[0]?.replace(/\/$/, '') ?? null;
  } catch { return null; }
};

const main = async () => {
  const { data: done } = await gtm.schema('gtm').from('events').select('lead_id').eq('kind', 'fb_sent');
  const doneIds = new Set((done ?? []).map((d) => d.lead_id));
  const { data: leads } = await gtm.schema('gtm').from('leads')
    .select('id,name,website,city').not('website', 'is', null)
    .in('status', ['staged', 'cold', 'enriched']).limit(120);
  const queue = (leads ?? []).filter((l) => !doneIds.has(l.id)).slice(0, LIMIT * 4);
  if (!queue.length) return console.log('no leads for fb lane');

  const browser = await chromium.launchPersistentContext(
    join(SEC, 'fb-profile'), { headless: false, viewport: { width: 1280, height: 800 } });
  const page = browser.pages()[0] ?? await browser.newPage();
  await page.goto('https://www.facebook.com', { waitUntil: 'domcontentloaded' });
  await sleep(6000);
  if ((await page.locator('body').innerText()).includes('Log in')) {
    await browser.close(); throw new Error('fb login needed - open the window and log in');
  }

  let sent = 0;
  for (const lead of queue) {
    const fb = await findFbUrl(lead, page);
    if (!fb) { console.log('no-fb-page', lead.name); continue; }
    try {
      if (hasFlag('--dry')) { console.log('DRY', lead.name, fb); continue; }
      await page.goto(fb, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(5000);
      const msgBtn = page.getByRole('button', { name: /Nhắn tin|Send message|Message/i }).first();
      if (!await msgBtn.count()) { console.log('no-msg-btn', lead.name, fb); continue; }
      await msgBtn.click();
      await sleep(4000);
      const box = page.locator('[contenteditable="true"]').last();
      await box.click(); await box.pressSequentially(MSG(), { delay: 15 });
      await page.keyboard.press('Enter');
      await gtm.schema('gtm').from('events').insert({
        lead_id: lead.id, kind: 'fb_sent', payload: { fb_url: fb, channel: 'messenger' },
      });
      sent++;
      console.log('fb_sent', lead.name, fb);
      await sleep(GAP_MS);
    } catch (e) {
      console.log('ERR', lead.name, e.message.slice(0, 100));
      await sleep(8000);
    }
  }
  await browser.close();
  console.log(`fb lane: ${sent} sent`);
};
main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
