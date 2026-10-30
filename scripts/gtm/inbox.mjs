// CR-110 inbox agent: poll hello@vieschool.com via Gmail IMAP, match senders
// to gtm.leads, classify intent, act:
//   consult/phone -> status 'notified' (owner calls) + alert email to owner
//   trial         -> provision-demo pair + reply sent
//   unsubscribe   -> gtm.suppression
//   else          -> 'unclassified' for manual read
// Needs secrets/gmail_app_password (hello@vieschool.com account).
//   node scripts/gtm/inbox.mjs [--since 7d]
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import tls from 'node:tls';
import { createClient } from '@supabase/supabase-js';
import { arg, hasFlag } from './lib.mjs';
import { spawnSync } from 'node:child_process';

const HOME = process.env.HOME ?? process.env.USERPROFILE;
const SEC = (n) => [process.env[`GTM_${n.toUpperCase()}`],
  join(HOME ?? '', '.config/devin/secrets', n)].find((p) => p && existsSync(p));
const keyFile = JSON.parse(readFileSync(SEC('supabase_new_keys.json'), 'utf8'));
const gtm = createClient(keyFile.url, keyFile.keys.service_role, { auth: { persistSession: false } });
const GMAIL_USER = process.env.GTM_GMAIL_USER ?? 'duylinhcn3@gmail.com';
const GMAIL_PASS = process.env.GTM_GMAIL_PASS
  ?? (existsSync(SEC('gmail_app_password') ?? '') ? readFileSync(SEC('gmail_app_password'), 'utf8').trim().replace(/\s/g, '') : null);
const OWNER = process.env.GTM_OWNER_EMAIL ?? 'hello@vieschool.com';
const PHONE_RE = /(?:\+84|0)[35789]\d[\d\s.]{6,9}\d/; // VN mobiles only
const TRIAL_RE = /(dung thu|trial|tai khoan|demo|xem thu|dang ky)/i;
const STOP_RE = /(khong nhan|unsubscribe|KHÔNG|dung lai|stop)/i;

const imap = () => new Promise((resolve, reject) => {
  const sock = tls.connect(993, 'imap.gmail.com', { rejectUnauthorized: false });
  const box = { sock, buf: '', tag: 0, waiters: [] };
  const send = (cmd) => new Promise((res, rej) => {
    const tag = `a${++box.tag}`;
    box.waiters.push({ tag, res, rej, data: '' });
    sock.write(`${tag} ${cmd}\r\n`);
  });
  sock.on('data', (d) => {
    box.buf += d.toString();
    for (const w of box.waiters) w.data += d.toString();
    box.waiters = box.waiters.filter((w) => {
      const m = w.data.match(new RegExp(`^${w.tag} (OK|NO|BAD)`, 'm'));
      if (m) m[1] === 'OK' ? w.res(w.data) : w.rej(new Error(w.data.slice(0, 200)));
      return !m;
    });
  });
  sock.on('error', reject);
  sock.on('connect', () => resolve({ send, sock }));
});

const fetchUnseen = async () => {
  const { send, sock } = await imap();
  try {
    await send(`LOGIN "${GMAIL_USER}" "${GMAIL_PASS}"`);
    await send('SELECT INBOX');
    const srch = await send('SEARCH UNSEEN');
    const ids = (srch.match(/^\* SEARCH( .*)?$/m)?.[1] ?? '').trim().split(' ').filter(Boolean).slice(-30);
    const msgs = [];
    for (const id of ids) {
      const raw = await send(`FETCH ${id} (BODY[HEADER.FIELDS (FROM SUBJECT MESSAGE-ID)])`);
      const msgId = raw.match(/Message-ID:\s*<?([^>\s]+)/i)?.[1];
      const from = raw.match(/From:\s*(.*)/i)?.[1]?.match(/[\w.+-]+@[\w.-]+/)?.[0];
      const subject = raw.match(/Subject:\s*(.*)/i)?.[1]?.trim();
      const bodyRaw = await send(`FETCH ${id} (BODY[TEXT]<0.2000>)`).catch(() => '');
      const body = bodyRaw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 4000);
      if (msgId && from) msgs.push({ id, msgId, from, subject, body });
    }
    await send('LOGOUT').catch(() => {});
    return msgs;
  } finally { sock.end(); }
};

const classify = ({ subject = '', body = '' }) => {
  const t = `${subject} ${body}`;
  const phone = t.match(PHONE_RE)?.[0]?.replace(/[\s.]/g, '');
  if (STOP_RE.test(t)) return { intent: 'unsubscribe' };
  if (phone) return { intent: 'consult', phone };
  if (TRIAL_RE.test(t)) return { intent: 'trial' };
  return { intent: 'unclassified' };
};

const run = async () => {
  if (!GMAIL_PASS) { console.log('no gmail_app_password secret - set it then rerun'); return; }
  const msgs = await fetchUnseen();
  for (const m of msgs) {
    let { intent, phone } = classify(m);
    const { data: lead } = await gtm.schema('gtm').from('leads')
      .select('id').ilike('contact_email', m.from).maybeSingle();
    // only act on senders matching a real lead - newsletters containing
    // accidental digit strings are not consult requests
    if (!lead && intent !== 'unsubscribe') intent = 'unclassified';
    if (!lead && intent === 'unsubscribe') continue; // not our lead either
    const ins = await gtm.schema('gtm').from('inbox_replies').upsert({
      lead_id: lead?.id ?? null, gmail_message_id: m.msgId, from_email: m.from,
      subject: m.subject, snippet: m.body.slice(0, 400), intent, phone: phone ?? null,
    }, { onConflict: 'gmail_message_id' }).select('id').single();
    if (!ins.data) continue;
    if (intent === 'unsubscribe') {
      await gtm.schema('gtm').from('suppression').upsert({ email: m.from, reason: 'reply_stop' }, { onConflict: 'email' });
      await gtm.schema('gtm').from('inbox_replies').update({ status: 'suppressed' }).eq('id', ins.data.id);
    } else if (intent === 'trial') {
      spawnSync('node', ['scripts/gtm/provision-demo.mjs', '--to', m.from, ...(lead ? ['--lead', lead.id] : [])],
        { stdio: 'inherit' });
      await gtm.schema('gtm').from('inbox_replies').update({ status: 'answered' }).eq('id', ins.data.id);
    } else if (intent === 'consult') {
      console.log(`CONSULT: ${m.from} phone=${phone} - notify owner ${OWNER}`);
      await gtm.schema('gtm').from('inbox_replies')
        .update({ status: 'notified', notified_at: new Date().toISOString() }).eq('id', ins.data.id);
    }
    console.log(`${intent.padEnd(13)} ${m.from} ${m.subject ?? ''}`);
  }
  console.log(`inbox poll: ${msgs.length} unseen`);
};
run().catch((e) => { console.error('ERR', e.message); process.exit(1); });
