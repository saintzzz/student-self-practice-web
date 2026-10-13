// Self-test for scripts/check-ea-classes.mjs: bad fixture must trip every
// known class, good fixture must be clean. A rule without coverage here is
// a false negative waiting for the next review round.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// r11: capture the exit code too - a scanner that prints the success
// marker but exits nonzero must not pass the good/repo assertions.
function scan(root) {
  try {
    const out = execFileSync("node", ["scripts/check-ea-classes.mjs"], {
      cwd: ROOT,
      env: { ...process.env, EA_SCAN_ROOT: root },
      encoding: "utf8",
    });
    return { out, code: 0 };
  } catch (e) {
    return { out: (e.stdout ?? "") + (e.stderr ?? ""), code: e.status ?? 1 };
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
  // r6 classes
  "unverified-recipient",
  "email-html-injection",
  "xff-spoofable",
  // r7 classes
  "grant-shadow-column-revoke",
  "sql-cas-transition",
  "mic-lifecycle",
  "provider-config-regression",
  "function-return-type-replay",
  // r8 classes
  "verify-token-binding",
  "verification-mail-quota",
  "privilege-mutation-compat",
  "rpc-result-enum",
  "fetch-mode-parity",
  // r10 classes
  "async-response-staleness",
  "priority-pagination-inversion",
  "gate-orchestration-omission",
  "retry-nontransient-errors",
  // r11 classes
  "mutation-view-context-race",
  "audit-runtime-portability",
  "scanner-selftest-exit-status",
  "audit-network-timeout",
  // r13 classes
  "auth-signout-error-loss",
  "pagination-offset-after-mutation",
  // r14 classes
  "telemetry-owner-binding",
  "pre-start-time-accounting",
  "orphaned-tool-imports",
  // r15 classes
  "generator-answer-consistency",
  "updater-side-effect",
  // r16 classes
  "result-owner-binding",
  "one-shot-effect-replay",
  // r17 classes
  "cross-tab-stale-session",
  "arena-owner-binding",
  "sync-merge-lossy",
  "test-flag-in-prod",
];

test("ea-classes scanner flags every known-bad fixture class", () => {
  const { out, code } = scan("tests/fixtures/ea-bad");
  for (const cls of CLASSES)
    assert.match(out, new RegExp(`ea:${cls}`), `scanner phai flag ${cls}`);
  assert.notEqual(code, 0, "scanner phai exit nonzero tren bad fixture");
});

test("ea-classes scanner produces zero hits on good fixture", () => {
  const { out, code } = scan("tests/fixtures/ea-good");
  assert.equal(code, 0, `scanner exit ${code} tren good fixture: ${out.slice(-400)}`);
  assert.match(out, /All EA defect-class checks passed/, out);
});

test("ea-classes gate passes on real repo", () => {
  const { out, code } = scan("");
  assert.equal(code, 0, `scanner exit ${code} tren real repo: ${out.slice(-400)}`);
  assert.match(out, /All EA defect-class checks passed/, out);
});
