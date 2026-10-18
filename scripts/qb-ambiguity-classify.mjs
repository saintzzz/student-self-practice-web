#!/usr/bin/env node
/**
 * CR-82-A: ambiguity adjudication for same-lexicon-set MCQ candidates.
 *
 * Input: docs/qa/flagged/*.json (rows already narrowed to "answer + >=2
 * distractors share a semantic set, no asset/audio/passage context").
 *
 * Rule: keep only when the prompt provides a UNIQUE semantic selector -
 * a fact, definition, sound/attribute mapping, kinship logic, sequence,
 * article grammar, or category exclusion that exactly one choice satisfies.
 * Everything else is an open cloze where >1 answer is valid -> reject.
 *
 * Verdicts are conservative both ways: KEEP requires a positive selector
 * AND the keyed answer actually satisfying it; REVIEW is reserved for
 * prompts that look structured but the keyed answer fails the selector.
 *
 *   node scripts/qb-ambiguity-classify.mjs            -> writes verdicts.json + report
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'qa', 'flagged');
const rows = readdirSync(DIR).filter((f) => /^set\d+\.json$/.test(f))
  .flatMap((f) => JSON.parse(readFileSync(join(DIR, f), 'utf8')));

import { selector } from './qb-ambiguity-lib.mjs';

const verdicts = rows.map((r) => {
  const keep = selector(r.p, r.a, r.c, r.s);
  return { id: r.id, g: r.g, s: r.s, p: r.p, a: r.a, c: r.c, verdict: keep ? 'keep' : 'reject' };
});

const bySet = {};
for (const v of verdicts) { (bySet[v.s] ??= { keep: 0, reject: 0 })[v.verdict]++; }
console.log('total:', verdicts.length);
for (const [s, c] of Object.entries(bySet).sort()) console.log(`  ${s}: keep=${c.keep} reject=${c.reject}`);
const rej = verdicts.filter((v) => v.verdict === 'reject');
console.log('\nREJECT ids:', rej.length);
writeFileSync(join(DIR, 'verdicts.json'), JSON.stringify(verdicts, null, 0));
// Generated rejects regenerate from current verdicts each run - manual
// quarantines live in reject-ids-manual.json so a reclassified 'keep' id can
// leave this file (r64 finding). qb-quarantine-apply unions both.
writeFileSync(join(DIR, 'reject-ids.json'), JSON.stringify(rej.map((v) => v.id)));
// samples per set for eyeball check
for (const s of Object.keys(bySet).sort()) {
  console.log(`\n--- ${s} REJECT samples ---`);
  rej.filter((v) => v.s === s).slice(0, 4).forEach((v) => console.log(`  ${v.id} | ${v.p} -> ${v.a} | [${v.c.join(', ')}]`));
  console.log(`--- ${s} KEEP samples ---`);
  verdicts.filter((v) => v.s === s && v.verdict === 'keep').slice(0, 4).forEach((v) => console.log(`  ${v.id} | ${v.p} -> ${v.a} | [${v.c.join(', ')}]`));
}
