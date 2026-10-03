// Download all question/answer images referenced in a harvested bank file.
import fs from 'fs';
const BANK = process.env.BANK ?? '/tmp/vio-captures/bank-math-en.json';
const DIR = '/tmp/vio-captures/imgs';
const bank = JSON.parse(fs.readFileSync(BANK));
const urls = new Set();
const IMG_RE = /https:\/\/images1\.violympic\.vn\/[^"')\s]+/g;
const addFrom = (s) => { for (const m of (s ?? '').matchAll(IMG_RE)) urls.add(m[0]); };
for (const e of Object.values(bank.questions)) {
  const q = e.q;
  addFrom(q.questionText);
  if (q.questionImage) urls.add('https://images1.violympic.vn/violympic/' + q.questionImage);
  if (q.questionAudio) urls.add('https://images1.violympic.vn/violympic/' + q.questionAudio);
  for (const a of [...(q.answers ?? []), ...(q.matchingAnswers ?? []), ...(q.matchingAnswersGroups ?? []), ...(q.orderedAnswers ?? [])]) {
    addFrom(a.text);
    if (a.image?.path) urls.add('https://images1.violympic.vn/violympic/' + a.image.path);
  }
}
console.log('total images:', urls.size);
const name = (u) => u.split('/').pop().replace(/[^A-Za-z0-9._-]/g, '_');
const list = [...urls];
let done = 0, fail = 0;
for (let i = 0; i < list.length; i += 8) {
  await Promise.all(list.slice(i, i + 8).map(async (u) => {
    try {
      const r = await fetch(u);
      if (!r.ok) { fail++; return; }
      fs.writeFileSync(`${DIR}/${name(u)}`, Buffer.from(await r.arrayBuffer()));
      done++;
    } catch { fail++; }
  }));
}
fs.writeFileSync('/tmp/vio-captures/img-map.json', JSON.stringify(Object.fromEntries(list.map(u => [u, 'imgs/' + name(u)])), null, 1));
console.log('done:', done, 'fail:', fail);
