// Thin wrapper: force the gemini-web provider for the shared generator.
// Equivalent to: node scripts/gen-codex-bank.mjs --provider gemini <args>
// Requires one-time login: node scripts/_gemini-login.mjs
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const HERE = dirname(fileURLToPath(import.meta.url));
const r = spawnSync('node', [join(HERE, 'gen-codex-bank.mjs'), '--provider', 'gemini', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(r.status ?? 1);
