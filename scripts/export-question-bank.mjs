#!/usr/bin/env node
/**
 * Export the full question bank to exports/question-bank/ for external
 * AI agents: per-grade, per-subject markdown (+ a single JSON) with
 * images copied alongside and voice items annotated.
 *
 * Run: node scripts/export-question-bank.mjs
 */
import { build } from 'esbuild';
import { mkdirSync, writeFileSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'exports/question-bank');
const TMP = join(ROOT, 'node_modules/.cache/export-entry.mjs');

mkdirSync(join(ROOT, 'node_modules/.cache'), { recursive: true });
await build({
  entryPoints: [join(ROOT, 'scripts/export-entry.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: TMP,
});
const exp = await import(pathToFileURL(TMP).href + '?t=' + Date.now());

const GRADES = exp.exportAll();
const GRADE_IDS = Object.keys(GRADES);
const GRADE_VI = { 'grade-1': 'Lớp 1', 'grade-2': 'Lớp 2', 'grade-3': 'Lớp 3', 'grade-4': 'Lớp 4', 'grade-5': 'Lớp 5' };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/* ---------- helpers ---------- */

const copied = new Set();
function image(src) {
  // '/images/vio/x.png' -> copy to OUT/images/vio/x.png, return relative path from grade file
  if (!src) return null;
  const rel = src.replace(/^\//, ''); // images/vio/x.png
  const dest = join(OUT, rel);
  if (!copied.has(rel)) {
    copied.add(rel);
    const srcAbs = join(ROOT, 'public', rel);
    if (existsSync(srcAbs)) {
      mkdirSync(join(OUT, 'images'), { recursive: true });
      mkdirSync(join(OUT, 'images/vio'), { recursive: true });
      mkdirSync(join(OUT, 'images/vocab'), { recursive: true });
      copyFileSync(srcAbs, dest);
    } else {
      return `(thieu file: ${src})`;
    }
  }
  return `../${rel}`;
}

const VOICE_NOTE =
  '> 🔊 **VOICE (cho AI agent):** day la transcript cua cau nghe. ' +
  'App khong ship file audio - giong doc duoc sinh bang TTS luc chay. ' +
  'Transcript duoi day chinh la noi dung be nghe thay.\n\n';

function mcq(item, i, extra = '') {
  const opts = item.options
    .map((o, k) => `   - ${k === item.answer ?? item.correctIndex ? '✅' : '⬜'} ${String.fromCharCode(65 + k)}. ${o}`)
    .join('\n');
  const correct = item.options[item.answer ?? item.correctIndex];
  return `${i + 1}. ${item.prompt}${extra}\n${opts}\n   **Dap an:** ${correct}${item.explanationVi ? ` | Giai thich: ${item.explanationVi}` : ''}\n`;
}

function examQ(q, i) {
  const img = q.imageUrl ? `\n   ![anh cau hoi](${image(q.imageUrl)})` : '';
  if (q.kind === 'grammar-mcq') {
    const opts = q.options.map((o, k) => {
      const optImg = q.optionImages?.[k] ? ` ![anh](${image(q.optionImages[k])})` : '';
      return `   - ${k === q.correctIndex ? '✅' : '⬜'} ${String.fromCharCode(65 + k)}. ${o}${optImg}`;
    }).join('\n');
    return `${i + 1}. ${q.prompt}${img}\n${opts}\n   **Dap an:** ${q.options[q.correctIndex]} | Giai thich: ${q.explanation}\n`;
  }
  if (q.kind === 'text-answer') {
    return `${i + 1}. ${q.displaySentence ?? q.sentence}${img}\n   **Dap an (chap nhan):** ${(q.accept ?? []).join(' / ')}\n   Cau day du: ${q.sentence} | Giai thich: ${q.explanation}\n`;
  }
  if (q.kind === 'true-false-reading') {
    return `${i + 1}. Doc: "${q.passage}"\n   Menh de: "${q.statement}" -> **Dap an: ${q.answer ? 'DUNG' : 'SAI'}** | Giai thich: ${q.explanation}\n`;
  }
  if (q.kind === 'word-order') {
    return `${i + 1}. Sap xep cac tu thanh cau: [${q.tiles.join(' | ')}]\n   **Dap an:** ${q.sentence} | Giai thich: ${q.explanation}\n`;
  }
  return `${i + 1}. [${q.kind}] ${JSON.stringify(q)}\n`;
}

/* ---------- per-grade writers ---------- */

function englishMd(g, d) {
  const L = [];
  const b = d.ioe;
  const extra = d.ioeBanks;
  L.push(`# ${GRADE_VI[g]} - TIENG ANH (English)\n`);
  L.push(`> Cau hoi lay tu: ngan hang IOE harvest that + bank tac gia + tu vung (nguon sinh cau luyen tap).\n`);

  // vocabulary
  L.push(`## 1. Tu vung (nguon sinh cau hoi luyen tap)\n`);
  L.push(`> Moi tu sinh ra cac dang cau: chon hinh/emoji dung tu, nghe dien tu, dem hinh, chu thua, doc phat am (voice), mo ta chon hinh...\n`);
  L.push(`| Tu | So nhieu | Emoji | Giai thich (VI) | Anh |`);
  L.push(`|---|---|---|---|---|`);
  for (const w of d.vocabulary.words) {
    const img = w.imageUrl ? `![img](${image(w.imageUrl)})` : '';
    L.push(`| ${w.word} | ${w.plural ?? ''} | ${w.emoji} | ${w.explanation} | ${img} |`);
  }
  L.push('');

  if (b?.listen?.length) {
    L.push(`## 2. Nghe (Listening) - ${b.listen.length} cau\n`);
    L.push(VOICE_NOTE);
    b.listen.forEach((t, i) => L.push(`${i + 1}. 🔊 "${t}"`));
    L.push('');
  }
  if (extra.pronunciation?.length) {
    L.push(`## 3. Phat am (Pronunciation MCQ) - ${extra.pronunciation.length} cau\n`);
    L.push(`> 🔊 **VOICE-ADJACENT:** cau trac nghiem ve am doc - hoc sinh tu doc, app co the doc mau bang TTS. Chu thich IPA trong giai thich.\n`);
    extra.pronunciation.forEach((q, i) => L.push(mcq(q, i)));
    L.push('');
  }
  let sec = 4;
  if (b?.mcq?.length) {
    L.push(`## ${sec++}. Trac nghiem IOE (MCQ) - ${b.mcq.length} cau\n`);
    b.mcq.forEach((q, i) => L.push(mcq(q, i)));
    L.push('');
  }
  if (b?.masked?.length) {
    L.push(`## ${sec++}. Dien chu con thieu - ${b.masked.length} cau\n`);
    b.masked.forEach((m, i) => L.push(`${i + 1}. "${m.displaySentence}" -> go vao: **${m.missing}** (tu day du: ${m.word}; cau goc: "${m.sentence}")`));
    L.push('');
  }
  if (b?.makeWord?.length) {
    L.push(`## ${sec++}. Ghep chu thanh tu - ${b.makeWord.length} cau\n`);
    b.makeWord.forEach((m, i) => L.push(`${i + 1}. Chunks: [${m.chunks.join(' | ')}] -> **${m.word}**`));
    L.push('');
  }
  const reorder = [...(b?.reorder ?? []), ...d.reorderAuthored];
  if (reorder.length) {
    L.push(`## ${sec++}. Sap xep tu thanh cau - ${reorder.length} cau\n`);
    reorder.forEach((s, i) => L.push(`${i + 1}. "${s}"`));
    L.push('');
  }
  if (b?.tf?.length) {
    L.push(`## ${sec++}. Doc hieu Dung/Sai (IOE) - ${b.tf.length} cau\n`);
    b.tf.forEach((t, i) => L.push(`${i + 1}. Doc: "${t.passage}"\n   Menh de: "${t.statement}" -> **${t.answer ? 'DUNG' : 'SAI'}**`));
    L.push('');
  }
  if (d.reading?.length) {
    L.push(`## ${sec++}. Doan doc + Dung/Sai (tac gia) - ${d.reading.length} doan\n`);
    d.reading.forEach((p, i) => {
      L.push(`${i + 1}. "${p.passage}"\n${p.statements.map((st) => `   - "${st.text}" -> **${st.answer ? 'DUNG' : 'SAI'}**`).join('\n')}\n   Giai thich: ${p.explanationVi}`);
    });
    L.push('');
  }
  if (d.grammar?.length) {
    L.push(`## ${sec++}. Ngu phap MCQ - ${d.grammar.length} cau\n`);
    d.grammar.forEach((q, i) => L.push(mcq(q, i)));
    L.push('');
  }
  for (const [key, label] of [['spelling', 'Chinh ta'], ['error', 'Tim phan sai'], ['correct', 'Cau dung ngu phap'], ['facts', 'Kien thuc chung']]) {
    if (extra[key]?.length) {
      L.push(`## ${sec++}. ${label} - ${extra[key].length} cau\n`);
      extra[key].forEach((q, i) => L.push(mcq(q, i)));
      L.push('');
    }
  }
  return L.join('\n');
}

function examPoolMd(g, pool, title, note) {
  const L = [`# ${GRADE_VI[g]} - ${title}\n`];
  if (note) L.push(`> ${note}\n`);
  pool.forEach((q, i) => L.push(examQ(q, i)));
  return L.join('\n');
}

/* ---------- write everything ---------- */

const index = [`# Ngan hang cau hoi English Arena - export ${new Date().toISOString().slice(0, 10)}\n`];
index.push(`## Cau truc\n\n- \`<grade>/english.md\` - tieng Anh (tu vung + nghe + MCQ + dien chu + ghep tu + sap xep + doc hieu + ngu phap)\n- \`<grade>/math-english.md\` - Toan bang tieng Anh (Violympic-style)\n- \`<grade>/science-english.md\` - Khoa hoc bang tieng Anh\n- \`question-bank.json\` - toan bo du lieu, machine-readable\n- \`images/\` - anh cau hoi tu host (public/images) duoc copy kem\n`);
index.push(`## Quy uoc\n\n- ✅ = dap an dung trong cau trac nghiem\n- 🔊 **VOICE**: cau co audio. App SINH audio bang TTS luc chay tu transcript - khong co file audio. Transcript in ra la dung noi dung be nghe.\n- Cau co anh: anh duoc copy vao \`images/\`, md link tuong doi.\n\n## So lieu\n\n| Khoi | Tu vung | Nghe | MCQ IOE | Dien chu | Ghep tu | Sap xep | Doc D/S | Ngu phap | Toan TA | KH TA |\n|---|---|---|---|---|---|---|---|---|---|---|`);

const full = {};
for (const g of GRADE_IDS) {
  const d = GRADES[g];
  const dir = join(OUT, g);
  mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, 'english.md'), englishMd(g, d));
  writeFileSync(
    join(dir, 'math-english.md'),
    examPoolMd(g, d.mathPool, 'TOAN TIENG ANH', 'Pool day du (da merge ngan hang Violympic that cho lop 2 + cau sinh tu generator, deterministic). Cau id `vio-*` = ngan hang that co anh kem.'),
  );
  writeFileSync(
    join(dir, 'science-english.md'),
    examPoolMd(g, d.sciencePool, 'KHOA HOC TIENG ANH', 'Pool sinh tu fact bank: moi fact -> MCQ + Dung/Sai + dien tu; + cau phan loai "Which one is a ...?".'),
  );

  const b = d.ioe ?? {};
  index.push(`| ${GRADE_VI[g]} | ${d.vocabulary.words.length} | ${b.listen?.length ?? 0} | ${b.mcq?.length ?? 0} | ${b.masked?.length ?? 0} | ${b.makeWord?.length ?? 0} | ${(b.reorder?.length ?? 0) + d.reorderAuthored.length} | ${(b.tf?.length ?? 0) + d.reading.reduce((a, p) => a + p.statements.length, 0)} | ${d.grammar.length} | ${d.mathPool.length} | ${d.sciencePool.length} |`);

  full[g] = d;
}

index.push('');
writeFileSync(join(OUT, 'INDEX.md'), index.join('\n'));
writeFileSync(join(OUT, 'question-bank.json'), JSON.stringify(full, null, 1));

console.log(`Exported -> ${OUT}`);
console.log(`Images copied: ${copied.size}`);
