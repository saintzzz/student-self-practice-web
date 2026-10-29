// CR-110 weekly orchestrator: one cron entry runs the whole loop.
//   node scripts/gtm/weekly.mjs [--send] [--province "Đà Nẵng"] [--segment center]
// Steps:
//   1. follow-ups: leads sent >=7d unreplied -> draft.mjs --followups,
//      each follow-up picks the week's rotating feature image
//   2. sweep: discover -> enrich -> draft -> send queue (dry unless --send)
//   3. expire sweep on demo accounts
import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { arg, hasFlag } from './lib.mjs';

const run = (f, a = []) =>
  spawnSync('node', [`scripts/gtm/${f}`, ...a], { stdio: 'inherit' }).status;

// Rotating feature images by ISO week - different visual every email.
const FEATURE_IMGS = [
  'feature-bank.png', 'feature-arena.png', 'feature-report.png',
  'feature-pronunciation.png', 'feature-assign.png',
];
export const weekImage = () => {
  const w = Math.ceil(((Date.now() - new Date(new Date().getFullYear(), 0, 1)) / 864e5
    + new Date(new Date().getFullYear(), 0, 1).getDay() + 1) / 7);
  const dir = join(process.cwd(), 'docs/gtm/images');
  const pick = FEATURE_IMGS[w % FEATURE_IMGS.length];
  return existsSync(join(dir, pick)) ? join(dir, pick) : null;
};

const main = () => {
  console.log('week image:', weekImage() ?? '(docs/gtm/images empty - text-only follow-ups)');
  run('draft.mjs', ['--followups']);                       // 1. >=4d unreplied per REQ-4.4; weekly cap via send
  const prov = arg('--province', null), seg = arg('--segment', 'center');
  if (prov) {
    run('discover.mjs', ['--province', prov, '--segment', seg]);
    run('enrich.mjs');
    run('draft.mjs');
  }
  if (hasFlag('--send')) run('send.mjs');                  // still needs GTM_SEND_ENABLED=1
  run('provision-demo.mjs', ['--expire']);                 // 3. expire 24h demos
};
main();
