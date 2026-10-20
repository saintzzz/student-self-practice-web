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
 * Requires: `codex` on PATH and `codex login` done once (ChatGPT account),
 * or a logged-in gemini-web profile (scripts/gemini-login.mjs) as fallback.
 * Output is appended to docs/reviews/EXTERNAL-REVIEW-rNN.md.
 */
import { execSync } from 'node:child_process';
import { createLlmChannel } from './llm-channel.mjs';
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

// Preflight: warn only - the channel falls back to the gemini-web profile.
if (!sh('codex --version')) {
  console.warn('codex CLI not found - will use gemini-web fallback only');
} else {
  const loginStatus = sh('codex login status') ?? '';
  if (!/logged in/i.test(loginStatus)) {
    console.warn('codex not logged in - will use gemini-web fallback only');
  }
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

console.log(`Running external review on ${label} (codex primary, gemini-web fallback)...`);
const channel = createLlmChannel({ workers: 1 });
let output, provider;
try {
  ({ text: output, provider } = await channel.call(prompt));
} catch (e) {
  console.error(`review failed on all channels: ${e.message}`);
  await channel.close();
  process.exit(1);
}
await channel.close();
console.log(`reviewer: ${provider}`);

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
  `# External Review - Round ${next} (${provider})\n\n` +
    `Reviewer: ${provider} (real external run). Scope: ${label}, HEAD=${head}.\n\n` +
    output +
    '\n',
);
console.log(`Wrote ${file}`);
