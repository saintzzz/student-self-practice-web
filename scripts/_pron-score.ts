/* Runs the REAL scorePronunciationAttempt over _pron_eval/results.json and
   prints the confusion matrix. Run: npx vite-node scripts/_pron-score.ts */
import { readFileSync } from 'node:fs';
import { scorePronunciationAttempt } from '../src/lib/rounds/pronunciationScoring';

interface Row {
  target: string;
  kind: 'good_child' | 'good_adult' | 'accent_vi' | 'wrong_word';
  spoken: string;
  transcript: string | null;
}

const rows = JSON.parse(readFileSync('_pron_eval/results.json', 'utf-8')) as Row[];

const expectPass = (k: Row['kind']) => k === 'good_child' || k === 'good_adult';

let pass = 0;
let fail = 0;
const lines: string[] = [];
for (const r of rows) {
  if (r.transcript == null) {
    lines.push(`${r.target.padEnd(10)} ${r.kind.padEnd(11)} TRANSCRIBE-ERR`);
    fail++;
    continue;
  }
  const { score, isCorrect } = scorePronunciationAttempt(r.target, r.transcript);
  const ok = isCorrect === expectPass(r.kind);
  ok ? pass++ : fail++;
  const mark = ok ? 'ok ' : 'BAD';
  lines.push(
    `${mark} ${r.target.padEnd(10)} ${r.kind.padEnd(11)} heard="${r.transcript}" score=${String(score).padStart(3)} ${isCorrect ? 'PASS' : 'fail'}`,
  );
}
console.log(lines.join('\n'));

// summary by kind
const by: Record<string, { ok: number; n: number }> = {};
for (const r of rows) {
  const { isCorrect } =
    r.transcript == null
      ? { isCorrect: false }
      : scorePronunciationAttempt(r.target, r.transcript);
  const b = (by[r.kind] ??= { ok: 0, n: 0 });
  b.n++;
  if (r.transcript != null && isCorrect === expectPass(r.kind)) b.ok++;
}
console.log('\n--- summary ---');
for (const [k, v] of Object.entries(by)) console.log(`${k.padEnd(12)} ${v.ok}/${v.n} behaved as expected`);
console.log(`overall ${pass}/${rows.length}`);
