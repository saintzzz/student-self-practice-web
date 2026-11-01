/**
 * CR-115b: rasterize governed twemoji flag/symbol SVGs to
 * public/images/vocab/<wordId>.webp (512px, white bg - same sticker
 * contract as concept art). Flags + pure-symbol words must be FACTUALLY
 * correct, so the word's own flag/sign emoji (twemoji, CC-BY) is the
 * source of truth - never a model's guess at an obscure flag.
 * SVG is INLINED (file:// inside setContent never loads).
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const PUB = join(ROOT, 'public');
const words = JSON.parse(readFileSync('/tmp/missing-full.json', 'utf8'));
const TWEMOJI_IDS = new Set(
  words.filter((w) => w.topicId.includes('flags') || ['hundred', 'cross-mark'].includes(w.id)).map((w) => w.id),
);

const svgFile = (emoji) =>
  [...emoji].map((c) => c.codePointAt(0).toString(16)).filter((h) => h !== 'fe0f').join('-') + '.svg';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
let done = 0;
const out = [];
for (const w of words) {
  if (!TWEMOJI_IDS.has(w.id)) continue;
  const svgPath = join(PUB, 'emoji', 'svg', svgFile(w.emoji));
  if (!existsSync(svgPath)) { console.log(`MISSING svg ${w.id} ${w.emoji}`); continue; }
  const markup = readFileSync(svgPath, 'utf8').replace('<svg ', '<svg width="512" height="512" ');
  await page.setContent(
    `<body style="margin:0;background:#fff;display:flex;align-items:center;justify-content:center;height:640px">${markup}</body>`,
  );
  await page.waitForTimeout(60);
  const buf = await page.locator('svg').screenshot();
  const tmpPng = `/tmp/flag-${w.id}.png`;
  writeFileSync(tmpPng, buf);
  execFileSync('python3', [
    '-c',
    `from PIL import Image; im=Image.open('${tmpPng}').convert('RGB'); im=im.resize((512,512),Image.LANCZOS); im.save('${join(PUB,'images','vocab',w.id+'.webp')}','WEBP',quality=90)`,
  ]);
  out.push({ id: w.id, word: w.word, svg: svgFile(w.emoji), svgPath });
  done++;
}
await browser.close();
console.log(`rasterized ${done} flag/symbol webps`);
writeFileSync('/tmp/flag-words.json', JSON.stringify(out));
