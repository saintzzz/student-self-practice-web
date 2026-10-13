#!/usr/bin/env node
/**
 * External Review Loop - real Codex run (replaces the phantom "Codex Cloud"
 * step that never fired: it only reviews PRs and this repo pushes to main).
 *
 * Usage:
 *   node scripts/external-review.mjs --commit <sha>     review one commit
 *   node scripts/external-review.mjs --base <ref>       review ref..HEAD
 *   node scripts/external-review.mjs --uncommitted      review working tree
 *   node scripts/external-review.mjs                    review last commit
 *
 * Requires: `codex` on PATH and `codex login` done once (ChatGPT account).
 * Output is appended to docs/reviews/EXTERNAL-REVIEW-rNN.md.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REVIEWS_DIR = 'docs/reviews';
const args = process.argv.slice(2);
const flag = args[0] ?? '--commit';
const value = args[1];

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    return null;
  }
}

// Preflight: codex installed + logged in.
if (!sh('codex --version')) {
  console.error('codex CLI not found - install: npm i -g @openai/codex');
  process.exit(1);
}
const loginStatus = sh('codex login status') ?? '';
if (!/logged in/i.test(loginStatus)) {
  console.error('codex not logged in - run `codex login` once (opens ChatGPT auth in browser).');
  process.exit(1);
}

let reviewArgs;
let label;
if (flag === '--base' && value) {
  reviewArgs = ['review', '--base', value];
  label = `base ${value}`;
} else if (flag === '--uncommitted') {
  reviewArgs = ['review', '--uncommitted'];
  label = 'working tree';
} else {
  const sha = flag === '--commit' && value ? value : sh('git rev-parse --short HEAD');
  reviewArgs = ['review', '--commit', sha];
  label = `commit ${sha}`;
}

// PROMPT conflicts with --commit/--base in codex review; only allowed with
// the default/--uncommitted invocation.
if (flag === '--uncommitted') {
  reviewArgs.push(
    'External post-deploy review per AGENTS.md. Scope: source correctness, ' +
      'structure, security, performance, UI/UX. Output findings as a numbered ' +
      'list: [severity blocker/major/minor] file:line - problem - suggested fix. ' +
      'If nothing actionable, say CLEAN explicitly. Terse, high signal.',
  );
}

console.log(`Running codex review on ${label}...`);
let output;
try {
  // .cmd shim on Windows - route through the shell for all platforms.
  const quoted = reviewArgs.map((a) => `"${String(a).replaceAll('"', '\\"')}"`).join(' ');
  output = execSync(`codex ${quoted}`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
    timeout: 20 * 60 * 1000,
  });
} catch (e) {
  console.error(`codex review failed: ${e.message}`);
  process.exit(1);
}

mkdirSync(REVIEWS_DIR, { recursive: true });
const rounds = readdirSync(REVIEWS_DIR)
  .map((f) => /^EXTERNAL-REVIEW-r(\d+)\.md$/.exec(f))
  .filter(Boolean)
  .map((m) => Number(m[1]));
const next = (rounds.length ? Math.max(...rounds) : 0) + 1;
const head = sh('git rev-parse --short HEAD');
const file = join(REVIEWS_DIR, `EXTERNAL-REVIEW-r${next}.md`);
writeFileSync(
  file,
  `# External Review - Round ${next} (Codex CLI)\n\n` +
    `Reviewer: codex-cli (real external run). Scope: ${label}, HEAD=${head}.\n\n` +
    output +
    '\n',
);
console.log(`Wrote ${file}`);
