import { readFileSync, readdirSync, existsSync } from 'fs';
const KEY = 'sb_publishable_dHxiF6xvVWSbbbEdrnZWSg_TgzAgXpB';
const BASE = 'https://cxjpgfhqchjoernfmcra.supabase.co';
/* Human clips from scripts/_pron-recorder.mjs live in _pron_eval/human/
   and are labeled src=human; synthetic TTS stays at the dir root. */
const files = readdirSync('_pron_eval').filter(f => f.endsWith('.webm'))
  .map((f) => ({ f, dir: '_pron_eval', src: 'tts' }));
if (existsSync('_pron_eval/human')) {
  for (const f of readdirSync('_pron_eval/human').filter((f) => f.endsWith('.webm'))) {
    files.push({ f, dir: '_pron_eval/human', src: 'human' });
  }
}
const rows = [];
for (const { f, dir, src } of files) {
  const target = f.replace(/_(good_child|good_adult|accent_vi|wrong_word)\.webm$/, '');
  const audio = readFileSync(`${dir}/${f}`).toString('base64');
  let status = 0, j = {};
  try {
    const res = await fetch(`${BASE}/functions/v1/practice-transcribe`, {
      method:'POST', headers:{'Content-Type':'application/json',apikey:KEY,Authorization:`Bearer ${KEY}`},
      body: JSON.stringify({audio, mimeType:'audio/webm', targetWord:target, mode:'assess'}),
    });
    status = res.status; j = await res.json().catch(()=>({}));
  } catch(e) { j = {error: e.message}; }
  rows.push({f, src, target, status, heard: j.transcript, accuracy: j.accuracy});
  console.log(`${(src+':'+f).padEnd(38)} ${status} heard=${JSON.stringify(j.transcript)} acc=${j.accuracy}`);
}
// expected: pass for good_*+accent_vi, fail for wrong_word
const buckets = {};
let okN=0, badN=0, errN=0;
for (const r of rows) {
  const caze = `${r.src}:${r.f.match(/(good_child|good_adult|accent_vi|wrong_word)/)[1]}`;
  const expectPass = caze !== 'wrong_word';
  if (r.status !== 200 || r.accuracy === undefined) { errN++; buckets[caze]=(buckets[caze]||[0,0]); continue; }
  // r49: production floor is ASSESS_PASS_MIN=85 in pronunciationScoring.ts
  const pass = r.accuracy >= 85;
  const behaved = pass === expectPass;
  buckets[caze] = buckets[caze]||[0,0]; buckets[caze][behaved?0:1]++;
  if (behaved) okN++; else badN++;
}
console.log('\n--- summary (assess mode, threshold 85 = ASSESS_PASS_MIN) ---');
for (const [c,[g,b]] of Object.entries(buckets)) console.log(`${c.padEnd(14)} ${g}/${g+b} behaved as expected`);
console.log(`overall ${okN}/${okN+badN}  (errors excluded: ${errN})`);
