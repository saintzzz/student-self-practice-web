// CR-110 provision-demo: trial request -> teacher+student demo pair,
// random passwords, 24h expiry, credentials email via Resend.
//   node scripts/gtm/provision-demo.mjs --lead <uuid> --to <email>
//   node scripts/gtm/provision-demo.mjs --expire          (sweep expired)
import { randomBytes } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { arg, hasFlag, gtmPost, gtmPatch } from './lib.mjs';

const KEYS = [
  join(process.env.APPDATA ?? '', 'devin/secrets/supabase_new_keys.json'),
  join(process.env.HOME ?? '', '.config/devin/secrets/supabase_new_keys.json'),
  join(process.env.USERPROFILE ?? '', '.config/devin/secrets/supabase_new_keys.json'),
].find(existsSync);
const { url, keys } = JSON.parse(readFileSync(KEYS, 'utf8'));
const admin = createClient(url, keys.service_role, { db: { schema: 'practice' }, auth: { persistSession: false } });
const gtm = createClient(url, keys.service_role, { auth: { persistSession: false } });

const RESEND_KEY = process.env.RESEND_API_KEY
  ?? readFileSync(join(process.env.HOME ?? '', '.config/devin/secrets/resend_api_key'), 'utf8').trim();
const rand = () => randomBytes(9).toString('base64url');
const APP = 'https://ea.vieschool.com';
const SITE = 'https://vieschool.com';

async function mkAccount(email, name, role) {
  const password = rand();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser ${email}: ${error.message}`);
  const { error: insErr } = await admin.from('accounts').insert({
    id: data.user.id, username: email.split('@')[0].replace(/[^a-z0-9_]/gi, '_'),
    display_name: name, role,
  });
  if (insErr) throw new Error(`accounts ${email}: ${insErr.message}`);
  return { id: data.user.id, email, password };
}

async function sendMail(to, subject, text) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'VieSchool <hello@vieschool.com>', to: [to], reply_to: 'hello@vieschool.com', subject, text }),
  });
  if (!r.ok) throw new Error(`resend ${r.status}: ${(await r.text()).slice(0, 160)}`);
}

const expireSweep = async () => {
  const { data } = await gtm.schema('gtm').from('demo_accounts')
    .select('id,auth_user_id,email').is('expired_at', null).lt('expires_at', new Date().toISOString());
  for (const a of data ?? []) {
    await admin.auth.admin.deleteUser(a.auth_user_id).catch(() => {});
    await gtm.schema('gtm').from('demo_accounts').update({ expired_at: new Date().toISOString() }).eq('id', a.id);
    console.log('expired', a.email);
  }
  console.log(`expire sweep: ${(data ?? []).length}`);
};

const main = async () => {
  if (hasFlag('--expire')) return expireSweep();
  const to = arg('--to', null); if (!to) throw new Error('need --to <email>');
  const lead = arg('--lead', null);
  const stamp = Date.now().toString(36);
  const exp = new Date(Date.now() + 24 * 3600e3);
  const gv = await mkAccount(`demo.gv.${stamp}@vieschool.com`, 'GV Demo VieSchool', 'teacher');
  const hs = await mkAccount(`demo.hs.${stamp}@vieschool.com`, 'HS Demo VieSchool', 'student');
  for (const a of [gv, hs]) {
    await gtm.schema('gtm').from('demo_accounts').insert({
      lead_id: lead || null, email: a.email, auth_user_id: a.id,
      role: a.email.includes('.gv.') ? 'demo_teacher' : 'demo_student',
      expires_at: exp.toISOString(), credentials_sent_at: new Date().toISOString(),
    });
  }
  await sendMail(to, 'Tai khoan dung thu VieSchool (hieu luc 24 gio)', [
    'Chao anh/chi,', '',
    'Em gui tai khoan dung thu VieSchool - hieu luc 24 gio ke tu luc nhan email nay.', '',
    `Link dang nhap: ${APP}`, `Tim hieu them san pham: ${SITE}`, '',
    'TAI KHOAN GIAO VIEN (tao lop, them hoc sinh, tao/giao de, xem bao cao):',
    `  Email: ${gv.email}`, `  Mat khau: ${gv.password}`, '',
    'TAI KHOAN HOC SINH (on luyen + lam bai duoc giao):',
    `  Email: ${hs.email}`, `  Mat khau: ${hs.password}`, '',
    'Goi y: dang nhap GV tao 1 lop, them HS tren vao lop, giao 1 bai - roi dang nhap',
    'HS de lam thu. Can gia han hoac trao doi them cu tra loi email nay.', '',
    'Tran trong,', 'VieSchool Team | hello@vieschool.com | vieschool.com',
  ].join('\n'));
  console.log('demo pair provisioned ->', to, '| expires', exp.toISOString());
};
main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
