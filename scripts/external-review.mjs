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
    // codex CLI writes status to stderr - merge it into the capture.
    return execSync(`${cmd} 2>&1`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
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

// `codex review` shells out to `git diff` itself - blocked by the exec
// sandbox policy in this environment. Compute the diff here and feed it to
// `codex exec` on stdin instead: same external reviewer, no exec needed.
let diffCmd;
let label;
if (flag === '--base' && value) {
  diffCmd = `git diff ${value}..HEAD`;
  label = `base ${value}`;
} else if (flag === '--uncommitted') {
  diffCmd = 'git diff HEAD';
  label = 'working tree';
} else {
  const sha = flag === '--commit' && value ? value : sh('git rev-parse --short HEAD');
  diffCmd = `git show ${sha} --format=short`;
  label = `commit ${sha}`;
}

const diff = execSync(diffCmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (!diff.trim()) {
  console.error('empty diff - nothing to review');
  process.exit(1);
}

const prompt =
  `External post-deploy review per AGENTS.md - independent reviewer, be adversarial.\n` +
  `Scope: source correctness, structure, security, performance, UI/UX, a11y.\n` +
  `Repo: Vite+React+TS kids English-learning app (Vietnamese G1-5).\n` +
  `Output: numbered findings "[severity blocker/major/minor] file:line - problem - fix". ` +
  `If nothing actionable, say CLEAN explicitly. Terse, high signal.\n\n` +
  `DIFF (${label}):\n${diff}`;

console.log(`Running codex exec on ${label}...`);
let output;
try {
  output = execSync('codex exec -', {
    input: prompt,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'inherit'],
    timeout: 20 * 60 * 1000,
    maxBuffer: 16 * 1024 * 1024,
  });
} catch (e) {
  console.error(`codex exec failed: ${e.message}`);
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
