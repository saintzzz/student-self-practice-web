// CR-110 zalo lane: phone-search + first-touch message for leads with SĐT.
// Session: secrets/zalo_state.json (refresh via playwright-cli -s=zalo state-save).
//   node scripts/gtm/zalo.mjs [--limit 10] [--headless] [--dry]
// Sends WITHOUT kết bạn (Nhắn tin works on phone-lookup). ~45s gap, cap 20/day
// - Zalo rate-limits aggressively, respect it.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { arg, hasFlag } from './lib.mjs';

const HOME = process.env.HOME ?? process.env.USERPROFILE;
const SEC = join(HOME ?? '', '.config/devin/secrets');
const { url, keys } = JSON.parse(readFileSync(join(SEC, 'supabase_new_keys.json'), 'utf8'));
const gtm = createClient(url, keys.service_role, { auth: { persistSession: false } });
const STATE = join(SEC, 'zalo_state.json');
const LIMIT = Number(arg('--limit', 500));
const DAILY_CAP = Number(process.env.GTM_ZALO_DAILY_CAP ?? 20);
const GAP_MS = 45e3;

const MSG = (lead) =>
  `Chào anh/chị, em bên VieSchool - hệ sinh thái số cho trường tiểu học: English Arena (99.000+ câu hỏi SGK Global Success, đề thi IOE, 15 trò chơi), Công cụ soạn đề giáo viên (ma trận, xuất Word/PDF), Sổ chủ nhiệm điện tử. Anh/chị có 5 phút để em giới thiệu không ạ? https://vieschool.com`;

const normPhone = (p) => (p ?? '').replace(/[^\d]/g, '').replace(/^84/, '0');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
  if (!existsSync(STATE)) throw new Error('missing secrets/zalo_state.json - run: playwright-cli -s=zalo state-save <path>');
  // no daily cap - user directive: run until contacts exhausted; 45s gap
  // between sends stays as the anti-ban control

  const { data: leads } = await gtm.schema('gtm').from('leads')
    .select('id,name,phone,city').not('phone', 'is', null)
    .in('status', ['staged', 'cold', 'enriched'])
    .order('created_at', { ascending: true }).limit(LIMIT * 4);
  // skip leads already zalo'd
  const { data: done } = await gtm.schema('gtm').from('events')
    .select('lead_id').eq('kind', 'zalo_sent');
  const doneIds = new Set((done ?? []).map((d) => d.lead_id));
  const queue = (leads ?? []).filter((l) => !doneIds.has(l.id)).slice(0, LIMIT);
  if (!queue.length) return console.log('no leads to zalo');

  // Persistent profile keeps IndexedDB (Zalo session) - storageState alone
  // does NOT carry it. First run: headed window opens, user scans QR once.
  const browser = await chromium.launchPersistentContext(
    join(SEC, 'zalo-profile'), {
      headless: false, // Zalo blocks/behaves differently headless - always headed
      viewport: { width: 1280, height: 800 },
    });
  const page = browser.pages()[0] ?? await browser.newPage();
  await page.goto('https://chat.zalo.me', { waitUntil: 'domcontentloaded' });
  // wait for login: handle "Đổi thiết bị" device-switch interstitial, then
  // chat UI must render ("Ưu tiên" sidebar tab) - up to 3min for QR scan
  let logged = false;
  for (let i = 0; i < 90 && !logged; i++) {
    await sleep(2000);
    const sw = page.getByText('Đổi thiết bị').first();
    if (await sw.isVisible().catch(() => false)) await sw.click().catch(() => {});
    logged = await page.getByText('Ưu tiên').first().isVisible().catch(() => false);
  }
  if (!logged) { await browser.close(); throw new Error('zalo login timeout - scan QR in the opened window'); }
  await sleep(3000);

  let sent = 0;
  for (const lead of queue) {
    const phone = normPhone(lead.phone);
    // mobiles only - landlines (02x) & shortcodes can't have personal Zalo
    if (!/^0[35789]\d{8}$/.test(phone)) continue;
    try {
      if (hasFlag('--dry')) { console.log('DRY', lead.name, phone); continue; }
      await page.locator('[title="Thêm bạn"], [aria-label*="Thêm bạn"], [data-translate-inner="STR_CONTACT_MANAGE_FRIEND"]').first().click({ timeout: 20000 });
      await page.getByPlaceholder(/Số điện thoại/i).fill(phone);
      await page.keyboard.press('Enter');
      await sleep(4000);
      const msgBtn = page.getByText('Nhắn tin', { exact: true }).last();
      if (!await msgBtn.count()) { console.log('no-zalo', phone, lead.name); await page.keyboard.press('Escape'); continue; }
      await msgBtn.click();
      await sleep(2500);
      const box = page.locator('[contenteditable="true"]').last();
      await box.fill(MSG(lead));
      await page.keyboard.press('Enter');
      await gtm.schema('gtm').from('events').insert({
        lead_id: lead.id, kind: 'zalo_sent',
        payload: { phone, channel: 'zalo' },
      });
      sent++;
      console.log('zalo_sent', lead.name, phone);
      await page.keyboard.press('Escape');
      await sleep(GAP_MS);
    } catch (e) {
      console.log('ERR', phone, e.message.slice(0, 120));
      await page.keyboard.press('Escape').catch(() => {});
      await sleep(5000);
    }
  }
  await browser.close();
  console.log(`zalo lane: ${sent} sent`);
};
main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
