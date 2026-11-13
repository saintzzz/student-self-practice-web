#!/usr/bin/env node
// Play Store publish pipeline - Google Play Developer API v3, no deps.
//
// Auth: service account JSON at ~/.config/devin/secrets/play-console-sa.json
// (one-time setup: create SA in Google Cloud, enable "Google Play
// Android Developer API", link it in Play Console > Users & permissions
// with Admin rights - see docs/play-publish-pipeline.md).
//
// What it does in one run:
//   node scripts/play-publish.mjs publish
//     1. open an Edit
//     2. write store listings (vi primary + en-US fallback)
//     3. upload icon, feature graphic, phone screenshots
//     4. upload the release AAB
//     5. create/refresh the production release
//     6. commit
//
// What it CANNOT do (Play Console hands-on, once):
//   create the app shell, Data safety form, Content rating,
//   Target audience / Designed for Families declarations.
//
// Usage:
//   node scripts/play-publish.mjs check     - verify auth + app access
//   node scripts/play-publish.mjs publish   - full publish flow
//   node scripts/play-publish.mjs publish --track internal  - closed track

import { readFileSync, existsSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const PKG = 'com.vieschool.englisharena';
const SA_PATH = join(homedir(), '.config', 'devin', 'secrets', 'play-console-sa.json');
const AAB_PATH = resolve(process.env.PLAY_AAB || '../ea-android/android/app/build/outputs/bundle/release/app-release.aab');
const ASSETS_DIR = resolve(process.env.PLAY_ASSETS || '_shots/store');
const ICON_PATH = resolve('public/icon-512.png');
const API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications';
const UPLOAD = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications';
const TRACK = process.argv.find((a) => a.startsWith('--track='))?.slice(8) || 'production';
const STATUS = process.argv.find((a) => a.startsWith('--status='))?.slice(9) || 'completed';
const RELEASE_NAME = '1.0.0';
const RELEASE_NOTES_VI = 'Phát hành đầu tiên.';

const LISTINGS = {
  'vi': {
    language: 'vi',
    title: 'English Arena',
    shortDescription:
      'Luyện tiếng Anh lớp 1-5 theo SGK Global Success - chơi mà học mỗi ngày',
    fullDescription: `English Arena giúp học sinh tiểu học luyện tiếng Anh mỗi ngày qua trò chơi, bài luyện và đề thi bám sát chương trình Tiếng Anh Global Success của Bộ Giáo dục và Đào tạo.

DÀNH CHO AI
- Học sinh lớp 1 đến lớp 5: luyện từ vựng, ngữ pháp, nghe, đọc và phát âm.
- Giáo viên: giao bài tập theo lớp, chấm và theo dõi tiến độ từng học sinh.
- Phụ huynh: xem báo cáo học tập của con theo tuần.

NỘI DUNG
- Hơn 99.000 câu hỏi tiếng Anh được kiểm duyệt, bám sát từng bài học SGK.
- Đề luyện, đề thi thử theo cấu trúc của trường.
- Nghe chuẩn, luyện phát âm có chấm điểm tự động.
- 15+ trò chơi: lật thẻ, bóng bay, đua xe, câu cá, đấu trường xếp hạng.

AN TOÀN CHO TRẺ EM
- Không quảng cáo, không mua bán trong app, không theo dõi.
- Học sinh chơi được ngay không cần tài khoản.
- Tài khoản học sinh do giáo viên hoặc phụ huynh tạo.
- Không chat, không nội dung do người dùng tạo công khai.

English Arena - sản phẩm của VieSchool.
Hỗ trợ: hello@vieschool.com - 0948 042 989 (Zalo/WhatsApp)`,
  },
  'en-US': {
    language: 'en-US',
    title: 'English Arena',
    shortDescription:
      'Grade 1-5 English practice aligned with Vietnam Global Success textbooks',
    fullDescription: `English Arena helps Vietnamese primary students (Grades 1-5) practice English daily through games, exercises and mock tests aligned with the MOET Global Success textbook program.

FOR
- Students grades 1-5: vocabulary, grammar, listening, reading, pronunciation.
- Teachers: assign classwork, grade, track per-student progress.
- Parents: weekly learning reports.

CONTENT
- 99,000+ reviewed English questions mapped to textbook lessons.
- Practice sets and mock exams.
- Native audio and auto-scored pronunciation practice.
- 15+ kid-friendly games and ranked arena challenges.

SAFE FOR CHILDREN
- No ads, no in-app purchases, no tracking.
- Kids can play without an account.
- Student accounts are created by teachers or parents.
- No chat, no public user-generated content.

English Arena - a VieSchool product.
Support: hello@vieschool.com`,
  },
};

// ---------- service-account JWT auth ----------
function b64url(o) {
  return Buffer.from(JSON.stringify(o)).toString('base64url');
}
async function accessToken() {
  const sa = JSON.parse(readFileSync(SA_PATH, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${unsigned}.${sig}`,
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`auth failed: ${JSON.stringify(j)}`);
  return j.access_token;
}

let TOKEN;
async function call(method, url, body, contentType) {
  TOKEN ??= await accessToken();
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(contentType ? { 'Content-Type': contentType } : {}),
    },
    body,
  });
  if (res.status === 204) return null;
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${JSON.stringify(j)}`);
  return j;
}
const api = (m, p, b, c) => call(m, `${API}/${PKG}${p}`, b, c);
const up = (p, b, c) => call('POST', `${UPLOAD}/${PKG}${p}`, b, c);

// ---------- stages ----------
async function openEdit() {
  const edit = await api('POST', '/edits', '{}', 'application/json');
  console.log('edit:', edit.id);
  return edit.id;
}

async function writeListings(editId) {
  for (const [lang, l] of Object.entries(LISTINGS)) {
    await api(
      'PUT',
      `/edits/${editId}/listings/${lang}`,
      JSON.stringify(l),
      'application/json',
    );
    console.log(`listing ${lang}: ok`);
  }
}

async function uploadImage(editId, imageType, filePath) {
  if (!existsSync(filePath)) {
    console.log(`  skip ${imageType}: ${filePath} missing`);
    return;
  }
  // clear old images of that type then upload new
  await api('DELETE', `/edits/${editId}/listings/vi/${imageType}`).catch(() => {});
  const bytes = readFileSync(filePath);
  await up(
    `/edits/${editId}/listings/vi/${imageType}?uploadType=media`,
    bytes,
    'image/png',
  );
  console.log(`image ${imageType}: ok (${filePath.split(/[\\/]/).pop()})`);
}

async function uploadBundle(editId) {
  const bytes = readFileSync(AAB_PATH);
  const r = await up(`/edits/${editId}/bundles?uploadType=media`, bytes, 'application/octet-stream');
  console.log(`aab uploaded: versionCode=${r.versionCode}`);
  return r.versionCode;
}

async function setTrack(editId, versionCode) {
  const track = {
    track: TRACK,
    releases: [
      {
        name: RELEASE_NAME,
        versionCodes: [String(versionCode)],
        status: STATUS,
        releaseNotes: [{ language: 'vi', text: RELEASE_NOTES_VI }],
      },
    ],
  };
  await api('PUT', `/edits/${editId}/tracks/${TRACK}`, JSON.stringify(track), 'application/json');
  console.log(`track ${TRACK}: v${versionCode} staged`);
}

async function commitEdit(editId) {
  const r = await api('POST', `/edits/${editId}:commit`, '{}', 'application/json');
  console.log('committed:', r.id ?? 'ok');
}

// ---------- entry ----------
const cmd = process.argv[2] || 'check';

if (!existsSync(SA_PATH)) {
  console.error(`missing service account key: ${SA_PATH}`);
  console.error('setup: docs/play-publish-pipeline.md (one-time, ~10 min)');
  process.exit(1);
}
if (cmd === 'publish' && !existsSync(AAB_PATH)) {
  console.error(`missing AAB: ${AAB_PATH} (build it first)`);
  process.exit(1);
}

if (cmd === 'check') {
  // GET /applications/{pkg} is not a real API endpoint - the true
  // access probe is opening an edit, then deleting it.
  const editId = await openEdit();
  await api('DELETE', `/edits/${editId}`);
  console.log('app reachable: yes (edit open+delete ok)');
} else if (cmd === 'assets') {
  // Listing images only: icon + feature graphic + phone screenshots.
  // No bundle/track changes - safe to run between releases.
  const editId = await openEdit();
  try {
    await uploadImage(editId, 'icon', ICON_PATH);
    await uploadImage(editId, 'featureGraphic', join(ASSETS_DIR, 'feature-graphic.png'));
    for (const f of ['01-entry.png', '02-home.png', '03-practice.png', '04-report.png']) {
      const fp = join(ASSETS_DIR, f);
      if (existsSync(fp)) {
        const bytes = readFileSync(fp);
        await up(`/edits/${editId}/listings/vi/phoneScreenshots?uploadType=media`, bytes, 'image/png');
        console.log(`screenshot ${f}: ok`);
      }
    }
    await commitEdit(editId);
    console.log('ASSETS COMMITTED (icon + featureGraphic + screenshots)');
  } catch (e) {
    await api('DELETE', `/edits/${editId}`).catch(() => {});
    throw e;
  }
} else if (cmd === 'publish') {
  const editId = await openEdit();
  try {
    await writeListings(editId);
    await uploadImage(editId, 'icon', ICON_PATH);
    await uploadImage(editId, 'featureGraphic', join(ASSETS_DIR, 'feature-graphic.png'));
    // phone screenshots: individual uploads
    for (const f of ['01-entry.png', '02-home.png', '03-practice.png', '04-report.png']) {
      const fp = join(ASSETS_DIR, f);
      if (existsSync(fp)) {
        const bytes = readFileSync(fp);
        await up(`/edits/${editId}/listings/vi/phoneScreenshots?uploadType=media`, bytes, 'image/png');
        console.log(`screenshot ${f}: ok`);
      }
    }
    const vc = await uploadBundle(editId);
    await setTrack(editId, vc);
    await commitEdit(editId);
    console.log(`PUBLISHED ${PKG} v${vc} -> ${TRACK}`);
  } catch (e) {
    await api('DELETE', `/edits/${editId}`).catch(() => {});
    throw e;
  }
} else if (cmd === 'promote') {
  // Move an ALREADY-UPLOADED versionCode to another track - Play rejects
  // re-uploading the same version code, so promotion must skip the bundle.
  const vc = Number(process.argv.find((a) => a.startsWith('--version='))?.slice(10));
  if (!vc) {
    console.error('usage: node scripts/play-publish.mjs promote --version=3 [--track=production]');
    process.exit(1);
  }
  const editId = await openEdit();
  try {
    await setTrack(editId, vc);
    await commitEdit(editId);
    console.log(`PROMOTED ${PKG} v${vc} -> ${TRACK}`);
  } catch (e) {
    await api('DELETE', `/edits/${editId}`).catch(() => {});
    throw e;
  }
} else {
  console.error('usage: node scripts/play-publish.mjs [check|assets|publish|promote] [--track=internal|production] [--version=N]');
  process.exit(1);
}
