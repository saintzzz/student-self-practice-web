// Self-test for scripts/check-ea-classes.mjs: bad fixture must trip every
// known class, good fixture must be clean. A rule without coverage here is
// a false negative waiting for the next review round.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function scan(root) {
  try {
    return execFileSync("node", ["scripts/check-ea-classes.mjs"], {
      cwd: ROOT,
      env: { ...process.env, EA_SCAN_ROOT: root },
      encoding: "utf8",
    });
  } catch (e) {
    return (e.stdout ?? "") + (e.stderr ?? "");
  }
}

const CLASSES = [
  "nondeterministic-generator",
  "open-cors",
  "committed-credentials",
  "mode-downgrade-fallback",
  "starvation-sampling",
  "telemetry-batch-abort",
  "push-silent-fail",
  "e2e-mock-incomplete",
  "rls-verify-tables",
  "scope-fail-open",
  "review-card-completeness",
  "service-role-in-client",
  "in-memory-rate-limit",
  "migration-grants",
  // r5 classes
  "migration-replay",
  "fetch-gate-parity",
  "variant-dedupe",
  "stats-access-path",
  "answer-shape-bool",
  "last-admin-race",
  "fk-auth-delete",
  "guest-state-leak",
  "push-count-honesty",
  "session-shrink",
  "skill-label-raw",
  "e2e-origin-vacuum",
];

test("ea-classes scanner flags every known-bad fixture class", () => {
  const out = scan("tests/fixtures/ea-bad");
  for (const cls of CLASSES)
    assert.match(out, new RegExp(`ea:${cls}`), `scanner phai flag ${cls}`);
});

test("ea-classes scanner produces zero hits on good fixture", () => {
  const out = scan("tests/fixtures/ea-good");
  assert.match(out, /All EA defect-class checks passed/, out);
});

test("ea-classes gate passes on real repo", () => {
  const out = scan("");
  assert.match(out, /All EA defect-class checks passed/, out);
});
