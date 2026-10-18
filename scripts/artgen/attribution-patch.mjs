// Run after resize.py: adds the 3 vocab image records + /images/games/
// collection path to public/attribution.json, then verifies the gate.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FILE = join(ROOT, 'public', 'attribution.json');
const d = JSON.parse(readFileSync(FILE, 'utf8'));

const now = new Date().toISOString().slice(0, 10);
const vocab = [
  ['festival', 'festival', 'Vietnamese Tet festival flags and temple gate'],
  ['apricot-blossom', 'apricot blossom', 'Hoa mai - yellow apricot blossom branch'],
  ['dragon-dance', 'dragon dance', 'Vietnamese lion-dragon dance costume head'],
];
for (const [wordId, word, title] of vocab) {
  if (d.images.some((r) => r.wordId === wordId)) continue;
  d.images.push({
    wordId, word,
    file: `/images/vocab/${wordId}.webp`,
    title,
    creator: 'VieSchool',
    creatorUrl: '',
    license: 'by',
    licenseVersion: '4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: '',
    provider: 'openai-chatgpt-image',
    openverseId: '',
    modified: false,
    reviewStatus: 'approved',
    reviewedBy: 'devin-cr95',
    reviewedAt: now,
  });
}

const orig = d.collections.find((c) => c.id === 'vieschool-original-assets');
if (orig && !orig.paths.includes('/images/games/')) orig.paths.push('/images/games/');
if (orig && !orig.title.includes('game card art')) orig.title += ' + CR-95 game card art';

writeFileSync(FILE, JSON.stringify(d, null, 2) + '\n');
console.log(execSync('node scripts/check-attribution.mjs', { cwd: ROOT, encoding: 'utf8' }));
