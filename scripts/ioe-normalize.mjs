// Normalize harvested IOE getinfo payloads into a flat question list.
// Usage: node scripts/ioe-normalize.mjs
// Input : docs/research/ioe/ioe-thithu-*.json
// Output: docs/research/ioe/normalized-g4.json
import fs from 'node:fs';
import path from 'node:path';

const DIR = new URL('../docs/research/ioe/', import.meta.url).pathname;
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && f.startsWith('ioe-thithu'));

const strip = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
const urlOf = (s) => (s || '').match(/https?:\/\/[^\s"'<>]+/)?.[0] || null;

const out = new Map();
for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  const qs = j?.data?.game?.question || [];
  for (const q of qs) {
    if (out.has(q.id)) continue;
    const content = strip(q.content?.content);
    const desc = strip(q.Description?.content);
    const img = urlOf(q.content?.content) || urlOf(q.Description?.content);
    const aud = (q.content?.content || '').match(/https?:\/\/[^\s"'<>]+\.(mp3|m4a|wav|ogg)/i)?.[0] || null;
    const base = { id: q.id, ioeType: q.type, point: q.Point, src: f };
    if (q.type === 10) {
      // MCQ: correct option has smallest orderTrue (0); distractors are 1..n
      const opts = (q.ans || []).map((a) => ({ t: strip(a.content), o: a.orderTrue, img: urlOf(a.content) }));
      const correct = opts.find((a) => a.o === 0);
      if (!correct || opts.length < 2) continue;
      out.set(q.id, { ...base, kind: 'mcq', prompt: content, image: img, audio: aud, options: opts.map((o) => o.t), optionImages: opts.map((o) => o.img), correctIndex: opts.indexOf(correct) });
    } else if (q.type === 5) {
      // reorder: sort tiles by orderTrue
      const tiles = (q.ans || []).map((a) => ({ t: strip(a.content), o: a.orderTrue }));
      const sentence = tiles.sort((a, b) => a.o - b.o).map((t) => t.t).join(' ');
      if (!sentence) continue;
      out.set(q.id, { ...base, kind: 'reorder', sentence, tiles: tiles.map((t) => t.t) });
    } else if (q.type === 2) {
      // masked word: content like "Aus******" + numTChar = hidden chars
      const m = content.match(/(\*+|_+)/);
      if (!m || !content) continue;
      out.set(q.id, { ...base, kind: 'masked', sentence: content, mask: m[0], missingCount: q.numTChar, image: img, audio: aud, answer: null });
    } else if (q.type === 1) {
      // T/F: Description = passage, content = statement; answer needs inference
      if (!desc || !content) continue;
      out.set(q.id, { ...base, kind: 'tf', passage: desc, statement: content, answer: null, needsReview: true });
    }
  }
}

const list = [...out.values()];
const byKind = {};
for (const q of list) byKind[q.kind] = (byKind[q.kind] || 0) + 1;
console.log('files:', files, 'unique:', list.length, byKind);
fs.writeFileSync(path.join(DIR, 'normalized-g4.json'), JSON.stringify(list, null, 1));
console.log('wrote normalized-g4.json');
