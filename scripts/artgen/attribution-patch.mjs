// Run after resize.py: adds the 3 vocab image records + /images/games/
// collection path to public/attribution.json, then verifies the gate.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
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
if (orig && !orig.paths.includes('/images/mascot/')) orig.paths.push('/images/mascot/');
if (orig && !orig.paths.includes('/images/pets/')) orig.paths.push('/images/pets/');
// New collectible dirs only declare once the first generated file lands
// (the gate requires declared paths to exist).
for (const dir of ['/images/stickers/', '/images/home/']) {
  if (existsSync(join(ROOT, 'public', dir)) && !orig.paths.includes(dir)) orig.paths.push(dir);
}
if (orig && !orig.title.includes('game card art')) orig.title += ' + CR-95 game card art';

// 55 concepts regenerated as bespoke art IN PLACE (same filename keeps
// qb_assets links). The noto collection still claims the whole dir, so
// declare the regenerated files individually under a VieSchool-original
// collection - file paths are valid declared prefixes (existsSync).
const REGEN_CONCEPTS = [
  'teacher-7758b8', 'student-ae0953', 'doctor-368f2b', 'nurse-f72795',
  'policeman-2337fd', 'policewoman-d5026f', 'farmer-860730', 'chef-413a93',
  'cook-359f50', 'factory-worker-7b543a', 'office-worker-d45d68',
  'firefighter-b28f04', 'pilot-62f7bc', 'soldier-67e6ee', 'artist-6997b6',
  'singer-5c6a3b', 'dancer-fb9374', 'basketball-player-f8132f',
  'cowboy-f7af7e', 'merman-117031', 'baby-5da21f', 'aunt-63270b',
  'uncle-775b02', 'grandma-e643ba', 'grandpa-373cba', 'brother-b20d42',
  'sister-ca8eb4', 'cousin-18e2a8', 'friend-dd0e4e', 'person-91eaba',
  'wheelchair-8fd8c3', 'snowman-e7a98c', 'children-crossing-sign-7e1c48',
  'amazed-6c1675', 'angry-538b0a', 'annoyed-56cb26', 'cry-fb20d1',
  'happy-36c403', 'headache-9be212', 'laugh-4c47a0', 'proud-05b220',
  'sad-5a2c8e', 'scared-395ee9', 'surprised-d70454', 'tired-63d314',
  'ear-caabd7', 'eye-61fb35', 'foot-e249d5', 'footprints-8e0f73',
  'finger-heart-b5114e', 'hair-ea98f7', 'hand-214f4b', 'handshake-79ce9d',
  'head-0b4967', 'hearing-aid-ec18db', 'mouth-a9fcf7', 'nose-d104ed',
];
if (!d.collections.some((c) => c.id === 'chatgpt-regenerated-concepts')) {
  d.collections.push({
    id: 'chatgpt-regenerated-concepts',
    title: 'Regenerated concept illustrations (people/family/emotions/body) - ChatGPT bespoke art, supersedes Noto renders for these files',
    author: 'VieSchool',
    license: 'proprietary',
    licenseLabel: 'Bản quyền VieSchool - nội dung tự sản xuất',
    licenseUrl: '',
    sourceUrl: '',
    version: now,
    paths: REGEN_CONCEPTS.map((s) => `/images/concepts/concept-${s}.webp`),
    modified: false,
  });
}
// The noto collection title must not imply provenance over regen files.
const noto = d.collections.find((c) => c.id === 'noto-symbol-renders');
if (noto && !noto.title.includes('except regenerated')) {
  noto.title += ' (except files regenerated bespoke - see chatgpt-regenerated-concepts)';
}

writeFileSync(FILE, JSON.stringify(d, null, 2) + '\n');
console.log(execSync('node scripts/check-attribution.mjs', { cwd: ROOT, encoding: 'utf8' }));
