/**
 * CR-46 - seed a realistic demo class so the weekly leaderboard looks
 * like a real classroom instead of test rows. Runs through the real
 * practice-admin edge function (auth.users + practice.accounts stay in
 * sync); enrollments/results are then inserted via SQL (see
 * docs/sdlc/CR-46). Idempotent: existing usernames are skipped.
 *
 * Usage: node scripts/seed-demo-class.mjs
 * Reads VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY from .env.local
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => [l.split('=')[0].trim(), l.split('=').slice(1).join('=').trim()]),
);

const EMAIL_DOMAIN = 'students.ioe-practice.example';
const ADMIN = { username: 'demo_admin', pin: 'demo2026' };
const STUDENT_PIN = 'demo2026';

/** Vietnamese-kid names that read as a real class roll. */
const STUDENTS = [
  // grade-1
  { u: 'hs_minhanh1', n: 'Minh Anh' }, { u: 'hs_giahan1', n: 'Gia Hân' },
  { u: 'hs_baonam1', n: 'Bảo Nam' }, { u: 'hs_tuelam1', n: 'Tuệ Lâm' },
  { u: 'hs_khoinguyen1', n: 'Khôi Nguyên' }, { u: 'hs_hamy1', n: 'Hà My' },
  { u: 'hs_annhien1', n: 'An Nhiên' },
  // grade-2
  { u: 'hs_giabao2', n: 'Gia Bảo' }, { u: 'hs_ngocha2', n: 'Ngọc Hà' },
  { u: 'hs_ducanh2', n: 'Đức Anh' }, { u: 'hs_mylinh2', n: 'Mỹ Linh' },
  { u: 'hs_quocbao2', n: 'Quốc Bảo' }, { u: 'hs_diepchi2', n: 'Diệp Chi' },
  { u: 'hs_tanphat2', n: 'Tấn Phát' },
  // grade-3
  { u: 'hs_baongoc3', n: 'Bảo Ngọc' }, { u: 'hs_minhkhoi3', n: 'Minh Khôi' },
  { u: 'hs_phuongthao3', n: 'Phương Thảo' }, { u: 'hs_hoanglong3', n: 'Hoàng Long' },
  { u: 'hs_khanhlinh3', n: 'Khánh Linh' }, { u: 'hs_anhtu3', n: 'Anh Tú' },
  { u: 'hs_mongtran3', n: 'Mộng Trân' },
  // grade-4
  { u: 'hs_thaovy4', n: 'Thảo Vy' }, { u: 'hs_dangkhoa4', n: 'Đăng Khoa' },
  { u: 'hs_ngoctram4', n: 'Ngọc Trâm' }, { u: 'hs_haidang4', n: 'Hải Đăng' },
  { u: 'hs_nhuy4', n: 'Như Ý' }, { u: 'hs_trongnhan4', n: 'Trọng Nhân' },
  { u: 'hs_camtu4', n: 'Cẩm Tú' }, { u: 'hs_anhquan4', n: 'Anh Quân' },
  // grade-5
  { u: 'hs_lananh5', n: 'Lan Anh' }, { u: 'hs_tuankiet5', n: 'Tuấn Kiệt' },
  { u: 'hs_thuhang5', n: 'Thu Hằng' }, { u: 'hs_minhtriet5', n: 'Minh Triết' },
  { u: 'hs_baochau5', n: 'Bảo Châu' }, { u: 'hs_huuphuoc5', n: 'Hữu Phước' },
  { u: 'hs_vylam5', n: 'Vy Lam' },
];

const supa = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  db: { schema: 'practice' },
});

const { error: authErr } = await supa.auth.signInWithPassword({
  email: `${ADMIN.username}@${EMAIL_DOMAIN}`,
  password: ADMIN.pin,
});
if (authErr) {
  console.error('admin sign-in failed:', authErr.message);
  process.exit(1);
}
console.log('signed in as', ADMIN.username);

const created = [];
for (const s of STUDENTS) {
  const { data, error } = await supa.functions.invoke('practice-admin', {
    body: { action: 'create-account', username: s.u, displayName: s.n, pin: STUDENT_PIN, role: 'student' },
  });
  if (error) {
    const msg = data?.error ?? error.message;
    if (String(msg).includes('da ton tai') || String(msg).includes('already')) {
      console.log(`skip (exists): ${s.u}`);
    } else {
      console.error(`FAIL ${s.u}:`, msg);
    }
    continue;
  }
  if (data?.error) {
    if (String(data.error).includes('da ton tai')) {
      console.log(`skip (exists): ${s.u}`);
    } else {
      console.error(`FAIL ${s.u}:`, data.error);
    }
    continue;
  }
  console.log(`created: ${s.u} -> ${data.accountId}`);
  created.push(s.u);
}
console.log(`\ndone - ${created.length} created, ${STUDENTS.length - created.length} skipped/failed`);
