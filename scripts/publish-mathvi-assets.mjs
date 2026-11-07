#!/usr/bin/env node
/**
 * CR-132 - attach deterministic SVG diagrams to visual math-vi questions.
 * Fetches math-vi rows, pattern-matches the template prompts (which we
 * authored, so the grammar is fixed), renders SVGs into
 * public/images/v6/math-vi/, and upserts qb_assets + qb_question_assets.
 * Never attaches an image that reveals the answer (clock-reading and
 * shape-naming questions get a face/blank or are skipped).
 *
 *   node scripts/publish-mathvi-assets.mjs [--dry]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderViz, vizLabel } from './lib-mathviz.mjs';

const DRY = process.argv.includes('--dry');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public/images/v6/math-vi');
const keys = JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8'));
const SUPA = keys.url, SVC = keys.keys.service_role;
const H = { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Accept-Profile': 'practice', 'Content-Profile': 'practice' };

const ITEMS = 'vở|bút|sách|kẹo|bi|cam|hoa|gà|nhãn vở|lít';
const RX_ADD = new RegExp(`có (\\d+) (${ITEMS})[,.].*?thêm (\\d+) \\2`);
const RX_PICK = new RegExp(`hái được (\\d+) (${ITEMS}), em hái được (\\d+) \\2`);
// prompt -> viz spec. Return null when the image would leak the answer
// or add nothing.
function vizFor(p) {
  let m;
  if ((m = p.match(/Hình chữ nhật có chiều dài (\d+) (cm|m), chiều rộng (\d+) \2/))) {
    const unit = m[2];
    // unit may be 'm' for g4 area questions
    return { type: 'shape', shape: 'rect', a: Number(m[3]), b: Number(m[1]), c: unit };
  }
  if ((m = p.match(/Hình vuông có cạnh (\d+) cm/))) return { type: 'shape', shape: 'square', a: Number(m[1]) };
  if ((m = p.match(/Hình tam giác có đáy (\d+) cm, chiều cao (\d+) cm/))) return { type: 'shape', shape: 'triangle', a: Number(m[1]), b: Number(m[2]) };
  if ((m = p.match(/Hình hộp chữ nhật dài (\d+) dm, rộng (\d+) dm, cao (\d+) dm/))) return { type: 'shape', shape: 'box', a: Number(m[1]), b: Number(m[2]), c: Number(m[3]) };
  // clock-reading questions: face only, no hands - hands would leak it
  if (/Kim phút chỉ vào số mấy|giờ rưỡi|giờ đúng/.test(p) && /đồng hồ|Kim phút|Bây giờ/i.test(p)) return { type: 'clock', h: 0, m: -1 };
  if ((m = p.match(/có (\d+) tờ (\d[\d.]*|hai|năm) ?(?:nghìn )?đồng/)) || (m = p.match(/có (\d+) tờ (\d+) nghìn/))) {
    let v = m[2];
    if (v === 'hai') v = 2; else if (v === 'năm') v = 5;
    const val = Number(String(v).replace(/\./g, ''));
    const per = val >= 1000 ? val : val * 1000; // '5 nghìn' -> 5000, '2000' -> 2000
    return { type: 'money', bills: Array(Number(m[1])).fill(per) };
  }
  if ((m = p.match(/Chia một cái bánh thành (\d+) phần bằng nhau/))) return { type: 'fraction', num: 1, den: Number(m[1]) };
  if ((m = p.match(/Phân số (\d+)\/(\d+) viết thành số thập phân/)) && Number(m[2]) <= 10) return { type: 'fraction', num: Number(m[1]), den: Number(m[2]) };
  // small-count add/compare word problems -> countable groups (unlabeled)
  if ((m = p.match(RX_ADD)) || (m = p.match(RX_PICK))) {
    const a = Number(m[1]), b = Number(m[3]);
    if (a + b <= 16) return { type: 'groups', a, b, emoji: m[2] };
  }
  return null;
}

const rows = [];
for (let off = 0; ; off += 1000) {
  const res = await fetch(`${SUPA}/rest/v1/qb_questions?subject=eq.math-vi&select=id,prompt_text,grade,skill&limit=1000&offset=${off}`, { headers: H });
  if (!res.ok) throw new Error(`fetch ${res.status}: ${await res.text()}`);
  const page = await res.json();
  rows.push(...page);
  if (page.length < 1000) break;
}
console.log(`math-vi rows: ${rows.length}`);

const assets = new Map(); // assetId -> {spec, svg, alt}
const links = [];         // {question_id, asset_id}
let skipped = 0;
for (const q of rows) {
  const spec = vizFor(q.prompt_text);
  if (!spec) { skipped++; continue; }
  const aid = `mathvi-${createHash('sha1').update(JSON.stringify(spec)).digest('hex').slice(0, 10)}`;
  if (!assets.has(aid)) {
    assets.set(aid, { spec, svg: renderViz(spec), alt: vizLabel(spec) });
  }
  links.push({ question_id: q.id, asset_id: aid, sort_order: 0 });
}
const bySkill = {};
for (const q of rows) {
  const spec = vizFor(q.prompt_text);
  const k = spec ? `${q.skill}:yes` : `${q.skill}:no`;
  bySkill[k] = (bySkill[k] ?? 0) + 1;
}
console.log(`matched ${links.length} questions -> ${assets.size} unique diagrams (${skipped} non-visual skipped)`);
console.log(bySkill);
if (DRY) {
  console.log([...assets.entries()].slice(0, 5).map(([id, a]) => `${id} :: ${a.alt}`));
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
for (const [id, a] of assets) writeFileSync(join(outDir, `${id}.svg`), a.svg);
console.log(`wrote ${assets.size} svgs -> public/images/v6/math-vi/`);

const assetRows = [...assets.entries()].map(([id, a]) => ({
  id, kind: 'generated-v6-diagram', file_path: `images/v6/math-vi/${id}.svg`,
  alt_text: a.alt, rights_status: 'owned-original-rendered',
  metadata: { source: 'cr132-mathvi-svg', spec: a.spec },
}));
const r1 = await fetch(`${SUPA}/rest/v1/qb_assets`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(assetRows) });
if (!r1.ok) throw new Error(`qb_assets upsert ${r1.status}: ${(await r1.text()).slice(0, 300)}`);
console.log('qb_assets upsert', r1.status);
const r2 = await fetch(`${SUPA}/rest/v1/qb_question_assets`, { method: 'POST', headers: { ...H, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' }, body: JSON.stringify(links) });
if (!r2.ok) throw new Error(`qb_question_assets upsert ${r2.status}: ${(await r2.text()).slice(0, 300)}`);
console.log('qb_question_assets upsert', r2.status);
