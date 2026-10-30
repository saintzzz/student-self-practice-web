// CR-110 reply poller: scan Zalo + Messenger for inbound replies, log to
// gtm.inbox_replies, classify, act:
//   phone/consult -> status 'notified' (owner calls)
//   trial         -> provision-demo pair automatically
//   stop          -> suppression
//   other         -> auto-reply once with consult ask, else 'unclassified'
//   node scripts/gtm/replies.mjs [--loop 300]   (seconds between polls)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { arg, hasFlag } from './lib.mjs';
import { spawnSync } from 'node:child_process';

const HOME = process.env.HOME ?? process.env.USERPROFILE;
const SEC = join(HOME ?? '', '.config/devin/secrets');
const { url, keys } = JSON.parse(readFileSync(join(SEC, 'supabase_new_keys.json'), 'utf8'));
const gtm = createClient(url, keys.service_role, { auth: { persistSession: false } });
const PHONE_RE = /(?:\+?84|0)\d[\d\s.]{7,11}/;
const TRIAL_RE = /(dung thu|trial|tai khoan|demo|xem thu|thu xem)/i;
const STOP_RE = /(khong nhan|unsubscribe|dung lai|spam|KHÔNG|thoi|đừng gửi)/i;
const ASK = `Da em cam on anh/chi. De tien trao doi, anh/chi cho em xin so dien thoai de em goi tu van 15 phut, hoac em gui tai khoan dung thu cho giao vien cua minh a? San pham day du tai https://vieschool.com`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const classify = (t) => {
  const phone = t.match(PHONE_RE)?.[0]?.replace(/[\s.]/g, '');
  if (STOP_RE.test(t)) return { intent: 'unsubscribe' };
  if (phone) return { intent: 'consult', phone };
  if (TRIAL_RE.test(t)) return { intent: 'trial' };
  return { intent: 'unclassified' };
};

const record = async ({ channel, peer, snippet }) => {
  const { intent, phone } = classify(snippet);
  const { data: lead } = await gtm.schema('gtm').from('leads')
    .select('id,phone,contact_email')
    .or(`name.ilike.%${peer.split(' ').slice(0, 4).join(' ')}%,phone.eq.${(snippet.match(PHONE_RE)?.[0] ?? '').replace(/\D/g, '')}`)
    .limit(1).maybeSingle().catch(() => ({ data: null }));
  const key = `${channel}:${peer}`;
  const { data: existing } = await gtm.schema('gtm').from('inbox_replies')
    .select('id,status').eq('gmail_message_id', key).maybeSingle();
  if (existing) return { id: existing.id, intent, phone, fresh: false };
  const { data } = await gtm.schema('gtm').from('inbox_replies').insert({
    lead_id: lead?.id ?? null, gmail_message_id: key, from_email: peer,
    subject: channel, snippet: snippet.slice(0, 400), intent, phone: phone ?? null,
  }).select('id').single();
  return { id: data?.id, intent, phone, fresh: true };
};

const act = async ({ id, intent, phone, peer, reply }) => {
  if (!id) return;
  if (intent === 'unsubscribe') {
    const { data: lead } = await gtm.schema('gtm').from('inbox_replies').select('lead_id').eq('id', id).single();
    const { data: l } = lead?.lead_id
      ? await gtm.schema('gtm').from('leads').select('contact_email').eq('id', lead.lead_id).single() : { data: null };
    if (l?.contact_email) await gtm.schema('gtm').from('suppression').upsert({ email: l.contact_email, reason: 'reply_stop' }, { onConflict: 'email' });
    await gtm.schema('gtm').from('inbox_replies').update({ status: 'suppressed' }).eq('id', id);
  } else if (intent === 'trial') {
    const { data: r } = await gtm.schema('gtm').from('inbox_replies').select('lead_id,from_email').eq('id', id).single();
    if (r?.from_email?.includes('@')) spawnSync('node', ['scripts/gtm/provision-demo.mjs', '--to', r.from_email, ...(r.lead_id ? ['--lead', r.lead_id] : [])], { stdio: 'inherit' });
    else if (reply) await reply(`Em gui tai khoan dung thu ngay - anh/chi cho em xin email de gui thong tin dang nhap (hieu luc 24h), hoac xem truoc tai https://vieschool.com`);
    await gtm.schema('gtm').from('inbox_replies').update({ status: 'answered' }).eq('id', id);
  } else if (intent === 'consult') {
    console.log(`!!! CONSULT ${peer} phone=${phone} - owner should call`);
    await gtm.schema('gtm').from('inbox_replies').update({ status: 'notified', notified_at: new Date().toISOString() }).eq('id', id);
  } else if (reply) {
    await reply(ASK);
    await gtm.schema('gtm').from('inbox_replies').update({ status: 'answered' }).eq('id', id);
  }
};

async function pollZalo(page) {
  await page.goto('https://chat.zalo.me', { waitUntil: 'domcontentloaded' });
  await sleep(8000);
  const sw = page.getByText('Đổi thiết bị').first();
  if (await sw.isVisible().catch(() => false)) await sw.click().catch(() => {});
  await sleep(4000);
  // unread badges: find chat items with unread count
  const items = page.locator('[id^="friend-item-"], .chat-item, [data-id*="conv"]');
  const n = Math.min(await items.count(), 40);
  for (let i = 0; i < n; i++) {
    const it = items.nth(i);
    const unread = await it.locator('.chat-item-mention, [class*="unread"], .unread').count().catch(() => 0);
    if (!unread) continue;
    const peer = (await it.innerText().catch(() => '')).split('\n')[0].trim();
    await it.click().catch(() => {});
    await sleep(3000);
    const msgs = await page.locator('.chat-message, [class*="message-content"]').allInnerTexts().catch(() => []);
    const last = msgs.slice(-3).join(' | ');
    if (!last || last.includes('Bạn:')) continue; // skip our own last msg
    console.log('zalo-reply', peer, '|', last.slice(0, 100));
    const rec = await record({ channel: 'zalo', peer, snippet: last });
    if (rec.fresh) await act({
      ...rec, peer,
      reply: async (text) => {
        const box = page.locator('[contenteditable="true"]').last();
        await box.click(); await box.pressSequentially(text, { delay: 12 });
        await page.keyboard.press('Enter'); await sleep(1500);
      },
    });
  }
}

async function pollFB(page) {
  await page.goto('https://www.messenger.com', { waitUntil: 'domcontentloaded' });
  await sleep(8000);
  const items = page.locator('[role="row"], [data-testid="mwthreadlist-item"], [aria-label*="chưa đọc"], [aria-label*="unread"]');
  const n = Math.min(await items.count(), 30);
  for (let i = 0; i < n; i++) {
    const it = items.nth(i);
    const label = await it.getAttribute('aria-label').catch(() => '');
    const unread = /chưa đọc|unread/i.test(label ?? '') || await it.locator('[data-testid="mwthreadlist-item-unread"], .x1yc453h').count().catch(() => 0);
    if (!unread) continue;
    const peer = (await it.innerText().catch(() => '')).split('\n')[0].trim() || label;
    await it.click().catch(() => {});
    await sleep(4000);
    const msgs = await page.locator('[dir="auto"]').allInnerTexts().catch(() => []);
    const last = msgs.slice(-4).join(' | ');
    console.log('fb-reply', peer, '|', last.slice(0, 100));
    const rec = await record({ channel: 'messenger', peer, snippet: last });
    if (rec.fresh) await act({
      ...rec, peer,
      reply: async (text) => {
        const box = page.locator('[contenteditable="true"]').last();
        await box.click(); await box.pressSequentially(text, { delay: 12 });
        await page.keyboard.press('Enter'); await sleep(1500);
      },
    });
  }
}

const main = async () => {
  // profiles are single-owner: wait until sender lanes release them
  let zb, fb;
  for (let i = 0; i < 240 && (!zb || !fb); i++) {
    try { zb = zb ?? await chromium.launchPersistentContext(join(SEC, 'zalo-profile'), { headless: false, viewport: { width: 1280, height: 800 } }); }
    catch { console.log('waiting for zalo-profile...'); }
    try { fb = fb ?? await chromium.launchPersistentContext(join(SEC, 'fb-profile'), { headless: false, viewport: { width: 1280, height: 800 } }); }
    catch { console.log('waiting for fb-profile...'); }
    if (!zb || !fb) await sleep(30000);
  }
  if (!zb || !fb) throw new Error('profiles stayed locked');
  const zp = zb.pages()[0] ?? await zb.newPage();
  const fp = fb.pages()[0] ?? await fb.newPage();
  const once = !arg('--loop', null);
  const gap = Number(arg('--loop', 300)) * 1000;
  do {
    await pollZalo(zp).catch((e) => console.log('zalo poll ERR', e.message.slice(0, 120)));
    await pollFB(fp).catch((e) => console.log('fb poll ERR', e.message.slice(0, 120)));
    console.log(`poll done ${new Date().toISOString()}`);
    if (!once) await sleep(gap);
  } while (!once);
  await zb.close(); await fb.close();
};
main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
