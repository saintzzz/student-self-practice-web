// Self-test for supabase/migrations/0051_fetch_questions_adaptive.sql
// (CR-107). Verifies the adaptive RPC keeps the keyless contract, the
// ZPD model constants, the authenticated-only grant shape, and the
// rate-limit stack cloned from fetch_questions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(
  join(ROOT, "supabase/migrations/0051_fetch_questions_adaptive.sql"),
  "utf8",
);
const IMPL = SRC.match(
  /create or replace function\s+practice\.fetch_questions_adaptive__impl[\s\S]*?\$\$;/i,
)?.[0] ?? "";
const WRAP = SRC.match(
  /create or replace function\s+practice\.fetch_questions_adaptive\s*\([\s\S]*?\$\$;/i,
)?.[0] ?? "";
assert.ok(IMPL, "adaptive __impl not found");
assert.ok(WRAP, "adaptive wrapper not found");

test("AC-107.1: rows pass strip_bank_row - keyless contract holds", () => {
  // The wrapper must strip every row through the CR-102 moat; the impl
  // may carry raw columns but the internal zpd_target must never leak.
  assert.match(WRAP, /practice\.strip_bank_row\(j\)/, "wrapper must strip rows");
  assert.match(IMPL, /-\s*'zpd_target'/, "impl must drop zpd_target from the payload");
  assert.match(IMPL, /security definer/, "impl must run definer-side like the source RPC");
});

test("AC-107.3: ZPD model - last-30 window, baseline 3, band map", () => {
  assert.match(IMPL, /rn\s*<=\s*30/, "proficiency must use the last 30 outcomes");
  assert.match(IMPL, /count\(\*\)\s*<\s*10\s*then\s*3/, "<10 outcomes -> baseline 3");
  assert.match(IMPL, /avg\(is_correct::int\)\s*<\s*0\.5\s*then\s*2/, "struggling -> ease to 2");
  assert.match(IMPL, /avg\(is_correct::int\)\s*>=\s*0\.85\s*then\s*4/, "mastered -> stretch to 4");
  // In-band first, then nearest - never a hard filter, so thin bands
  // fall back instead of under-filling the count.
  assert.match(IMPL, /abs\(pool\.difficulty\s*-\s*pool\.zpd_target\)\s*>\s*1\)/, "in-band preference ordering missing");
  assert.doesNotMatch(IMPL, /where\s+abs\(/, "difficulty must be a preference, not a filter");
});

test("AC-107.4: authenticated-only grants + full rate-limit stack", () => {
  assert.match(SRC, /revoke all on function practice\.fetch_questions_adaptive__impl[\s\S]*?from\s+public,\s*anon,\s*authenticated/i, "__impl must be revoked");
  assert.match(SRC, /revoke all on function practice\.fetch_questions_adaptive\([\s\S]*?from\s+public,\s*anon/i, "wrapper must be revoked from public+anon");
  assert.match(SRC, /grant execute on function practice\.fetch_questions_adaptive\([\s\S]*?to\s+authenticated,\s*service_role/i, "wrapper grants authenticated+service_role only");
  assert.doesNotMatch(SRC, /fetch_questions_adaptive[\s\S]*?to\s+anon/i, "anon must never hold execute");
  // r104: adaptive must charge the SHARED fq_* buckets - a parallel
  // fqa_* set would double the learner's aggregate fetch allowance.
  assert.match(WRAP, /fq_ip_calls:/, "per-IP call bucket missing");
  assert.match(WRAP, /fq_uid_calls:/, "per-uid call bucket missing");
  assert.doesNotMatch(WRAP, /check_rate_limit(?:_weighted)?\('fqa_/, "adaptive must not charge parallel buckets");
  assert.match(WRAP, /check_rate_limit_weighted/, "weighted row bucket missing");
});

test("AC-107.6: deterministic band order - random() is only the in-band tiebreak", () => {
  // Two calls with identical history must return the same ordering
  // shape: difficulty-distance keys must precede random() in BOTH the
  // variant-pick and the final ordering. If random() ever leads an
  // order-by, band selection becomes nondeterministic.
  // Final ordering: in-band flag -> distance -> random tiebreak.
  assert.match(IMPL,
    /abs\(pool\.difficulty\s*-\s*pool\.zpd_target\)\s*>\s*1\)[\s\S]{0,120}?abs\(pool\.difficulty\s*-\s*pool\.zpd_target\)[\s\S]{0,120}?random\(\)/,
    "final ordering must key on band flag then distance, random last");
  // Variant pick within a group: group key -> distance -> random.
  assert.match(IMPL,
    /coalesce\(q\.variant_group_id,\s*q\.id\)[\s\S]{0,120}?abs\(q\.difficulty[\s\S]{0,120}?random\(\)/,
    "variant pick must prefer the closest-to-target row in a group");
});

test("AC-107.7: p_mode passes through to the impl's mode filter", () => {
  for (const arm of ["examEligible", "mockEligible", "practiceEligible"])
    assert.ok(IMPL.includes(arm), `impl missing ${arm} arm`);
  assert.match(IMPL, /requiresHumanApprovalForExam/, "impl missing exam approval gate");
  assert.match(IMPL, /requiresHumanApprovalForCommercialRelease/, "impl missing release approval gate");
  assert.match(IMPL, /commercialReleaseEligible/, "impl missing commercial gate");
});
