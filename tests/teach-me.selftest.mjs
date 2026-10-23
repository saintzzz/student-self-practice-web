// Self-test for supabase/migrations/0052_teach_me_lessons.sql (CR-106).
// Verifies the taught-marks isolation, the teach RPC's keyless payload
// + auth/rate gates, the taught tag in the scoring oracle, and the
// fetch exclusion on every eligibility query.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(
  join(ROOT, "supabase/migrations/0052_teach_me_lessons.sql"),
  "utf8",
);
const TEACH = SRC.match(
  /create or replace function\s+practice\.teach_bank_question[\s\S]*?\$function\$;/i,
)?.[0] ?? "";
const SCORE = SRC.match(
  /create or replace function\s+practice\.score_bank_attempts[\s\S]*?\$function\$;/i,
)?.[0] ?? "";
const IMPL = SRC.match(
  /create or replace function\s+practice\.fetch_questions__impl[\s\S]*?\$function\$;/i,
)?.[0] ?? "";
const ADAPTIVE = SRC.match(
  /create or replace function\s+practice\.fetch_questions_adaptive__impl[\s\S]*?\$\$;/i,
)?.[0] ?? "";
assert.ok(TEACH, "teach_bank_question not found");
assert.ok(SCORE, "score_bank_attempts not found");
assert.ok(IMPL, "fetch_questions__impl not found");
assert.ok(ADAPTIVE, "fetch_questions_adaptive__impl not found");

test("AC-106.1: teach RPC is authenticated-only + rate-capped + idempotent", () => {
  assert.match(TEACH, /security definer/, "teach RPC must run definer-side");
  assert.match(TEACH, /if v_uid is null[\s\S]*?PT401/, "anon must raise PT401");
  assert.match(TEACH, /tbq_uid:/, "uid rate bucket missing");
  assert.match(TEACH, /on conflict \(account_id, question_id\) do nothing/, "mark must be idempotent");
  // The payload must NEVER carry answer key material - only lesson text.
  assert.doesNotMatch(TEACH, /\banswer\b|\bchoices\b/, "teach payload must not read answer/choices");
  assert.match(TEACH, /title_vi/, "lesson title missing from payload");
  assert.match(TEACH, /body_vi/, "lesson body missing from payload");
  // Grants: authenticated + service_role only.
  assert.match(SRC, /revoke all on function practice\.teach_bank_question\(text\)\s*from\s+public,\s*anon/i, "teach must be revoked from public+anon");
  assert.match(SRC, /grant execute on function practice\.teach_bank_question\(text\)[\s\S]*?to\s+authenticated,\s*service_role/i, "teach grants authenticated+service_role only");
  assert.doesNotMatch(SRC, /grant execute on function practice\.teach_bank_question[^;]*?to\s+anon/i, "anon must never hold execute");
});

test("AC-106.1: taught_marks + skill_lessons are deny-all to clients", () => {
  assert.match(SRC, /alter table practice\.taught_marks enable row level security/, "taught_marks RLS missing");
  assert.match(SRC, /revoke all on practice\.taught_marks from\s+public,\s*anon,\s*authenticated/i, "taught_marks grants must be revoked");
  assert.doesNotMatch(SRC, /create policy[\s\S]*?taught_marks/i, "taught_marks must stay deny-all");
  assert.match(SRC, /revoke all on practice\.skill_lessons from\s+public,\s*anon,\s*authenticated/i, "skill_lessons grants must be revoked");
});

test("AC-106.2: oracle tags taught rows but keeps grading", () => {
  assert.match(SCORE, /v_taught\s*:=[\s\S]*?taught_marks/, "taught lookup missing");
  assert.match(SCORE, /'taught',\s*v_taught/, "taught flag missing from result");
  // Grading still runs for taught rows - the flag is informational.
  const taughtCheck = SCORE.indexOf("v_taught :=");
  const grading = SCORE.indexOf("v_typed :=");
  assert.ok(taughtCheck > 0 && grading > taughtCheck, "taught check must not skip grading");
});

test("AC-106.3: every fetch eligibility query excludes caller-taught rows", () => {
  const implMarks = IMPL.match(/taught_marks/g) ?? [];
  assert.ok(implMarks.length >= 2, `fetch_questions__impl needs the exclusion in BOTH loops (found ${implMarks.length})`);
  assert.match(IMPL, /auth\.uid\(\) is null[\s\S]*?not exists/, "exclusion must be auth-gated (anon keeps full pool)");
  assert.match(ADAPTIVE, /taught_marks/, "adaptive impl missing taught exclusion");
  assert.match(ADAPTIVE, /auth\.uid\(\) is null[\s\S]*?not exists/, "adaptive exclusion must be auth-gated");
});
