import { mulberry32 } from './prng.mjs';
const rng = mulberry32(42);
const res = await fetch(url, { method: 'POST', body: '{}' });
if (!res.ok) { console.error('push fail', res.status); process.exit(1); }
// r15 good: reorder items carry a tile-vs-answer consistency proof.
const norm = (s) => String(s).toLowerCase().replace(/[^a-z ]/g, '');
const it = { ro: true, tokens: ['I', 'like', 'cats'], text: 'I like cats' };
const questionType = it.ro ? 'reorder' : 'mcq';
if (norm(it.tokens.join(' ')) !== norm(it.text)) throw new Error('unsolvable reorder');
console.log(questionType);
