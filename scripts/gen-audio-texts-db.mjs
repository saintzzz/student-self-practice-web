#!/usr/bin/env node
/** Dump every speakable DB text (listening transcripts) to
 *  audio-texts-db.tsv in gen-audio.py's sha1<TAB>kind<TAB>text format.
 *  kind: 'word-short' <=6 chars (monosyllable recipe), else 'sentence'.
 *  Run: node scripts/gen-audio-texts-db.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const KEY = JSON.parse(readFileSync(join(homedir(), '.config/devin/secrets/supabase_new_keys.json'), 'utf8')).keys.service_role;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Accept-Profile': 'practice' };
const sha1 = (t) => createHash('sha1').update(t).digest('hex');

const rows = [];
for (let off = 0; ; off += 1000) {
  const r = await fetch(
    `https://cxjpgfhqchjoernfmcra.supabase.co/rest/v1/qb_questions?select=id,transcript&transcript=not.is.null&limit=1000&offset=${off}`,
    { headers: H },
  );
  const b = await r.json();
  if (!b.length) break;
  rows.push(...b);
  if (b.length < 1000) break;
}

const seen = new Set();
const lines = [];
for (const q of rows) {
  const t = (q.transcript ?? '').trim();
  if (!t || seen.has(t)) continue;
  seen.add(t);
  const kind = t.replace(/[.!?…]+$/, '').trim().length <= 6 ? 'word-short' : 'sentence';
  lines.push(`${sha1(t)}\t${kind}\t${t}`);
}
writeFileSync(join(HERE, '..', 'audio-texts-db.tsv'), lines.join('\n') + '\n');
console.log(`transcripts: ${rows.length}, unique texts: ${lines.length}`);
