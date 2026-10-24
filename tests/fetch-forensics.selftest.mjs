// Self-test for supabase/migrations/0056_leak_watermark_fetch_audit.sql
// (CR-109 lop-1 #3/#4). Verifies the audit table is sealed, the
// helper functions are revoked, every drain wrapper emits a watermark
// and audits, and signature/ticket contracts are preserved.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(
  join(ROOT, "supabase/migrations/0056_leak_watermark_fetch_audit.sql"),
  "utf8",
);
const SRC57 = readFileSync(
  join(ROOT, "supabase/migrations/0057_leak_wm_actor_opacity.sql"),
  "utf8",
);
const SRC59 = readFileSync(
  join(ROOT, "supabase/migrations/0059_audit_backfill_scope_fix.sql"),
  "utf8",
);
const SRC60 = readFileSync(
  join(ROOT, "supabase/migrations/0060_audit_actor_canonical_restore.sql"),
  "utf8",
);
const SRC61 = readFileSync(
  join(ROOT, "supabase/migrations/0061_audit_actor_idempotent_restore.sql"),
  "utf8",
);
// 0057 re-creates the wrappers - the effective contract is 0057's
// bodies on top of 0056's table/helper.
const wrap = (name) =>
  (SRC57 + "\n" + SRC).match(
    new RegExp(
      `create or replace function\\s+practice\\.${name}\\s*\\([\\s\\S]*?\\$\\$;`,
      "i",
    ),
  )?.[0] ?? "";

test("audit table sealed: RLS on, revoked from every caller role", () => {
  assert.match(SRC, /create table if not exists practice\.qb_fetch_audit/i);
  assert.match(SRC, /alter table practice\.qb_fetch_audit enable row level security/i);
  assert.match(SRC, /revoke all on practice\.qb_fetch_audit from public, anon, authenticated/i);
});

test("log_fetch_audit never breaks a fetch and is not callable", () => {
  const fn = wrap("log_fetch_audit");
  assert.ok(fn, "log_fetch_audit def missing");
  assert.match(fn, /exception when others/i, "must swallow audit failures");
  assert.match(SRC, /revoke all on function practice\.log_fetch_audit[\s\S]*?from public, anon, authenticated/i);
});

test("leak_wm_tag fails open when the secret is absent", () => {
  const fn = wrap("leak_wm_tag");
  assert.ok(fn, "leak_wm_tag def missing");
  assert.match(fn, /when p_secret is null then '\{\}'::jsonb/, "null secret must emit {} not error");
  assert.match(SRC, /revoke all on function practice\.leak_wm_tag[\s\S]*?from public, anon, authenticated/i);
});

test("r115: wm signs the full id|actor|ip_hash|rpc payload", () => {
  const fn = wrap("leak_wm_tag");
  assert.match(
    fn,
    /p_row_id \|\| '\|' \|\| p_actor \|\| '\|' \|\|[\s\S]*?coalesce\(p_ip_hash, ''\)[\s\S]*?'\|' \|\| p_rpc/,
    "tag must bind id, actor, ip_hash and rpc",
  );
  assert.match(
    SRC57,
    /drop function if exists practice\.leak_wm_tag\(text, text, text\)/i,
    "weaker 3-arg overload must be dropped",
  );
});

test("r115: guest actor never embeds the raw client IP", () => {
  for (const name of ["fetch_questions", "fetch_questions_adaptive", "fetch_questions_public"]) {
    const fn = wrap(name);
    assert.ok(fn, `${name} def missing`);
    const actor = fn.match(/v_actor[^;]*;/)?.[0] ?? "";
    assert.doesNotMatch(
      actor,
      /'guest:' \|\| coalesce\(practice\.client_ip\(\)/,
      `${name} must not store raw IP in actor`,
    );
    assert.match(actor, /left\(v_ip_hash, 16\)/, `${name} guest actor must be hash-derived`);
  }
});

test("r117: backfill spares opaque actors and 'guest:unknown'", () => {
  const predicate = SRC59.match(/where[\s\S]*?;/)?.[0] ?? "";
  assert.match(
    predicate,
    /actor !~ '\^guest:\[0-9a-f\]\{16\}\$'/,
    "must not re-hash the 0057 opaque actor form",
  );
  assert.match(predicate, /actor <> 'guest:unknown'/);
});

test("r118/r120: canonical restore is idempotent by construction", () => {
  // 0061 supersedes 0058-0060: unconditional case over every 'guest:%'
  // row, so any replay depth converges to the canonical value.
  assert.match(SRC61, /where actor like 'guest:%'/);
  // ip_hash is authoritative whenever present.
  assert.match(SRC61, /when ip_hash is not null then 'guest:' \|\| left\(ip_hash, 16\)/);
  // Embedded raw-IP actors are hashed from the embedded value.
  assert.match(SRC61, /extensions\.digest\(\s*substring\(actor from '\^guest:\(\.\+\)\$'\)/);
  // 0058-corrupted 'unknown' is detected by its exact hash16 constant.
  assert.match(SRC61, /digest\('unknown'::bytea, 'sha256'\)/);
  // hex16 + null ip_hash is left as-is (else p_actor), not degraded.
  assert.doesNotMatch(SRC61, /when ip_hash is null then 'guest:unknown'/);
  // The behavioral fixture asserts, not just prints.
  const FIXTURE = readFileSync(join(ROOT, "tests/audit-actor-restore.sql"), "utf8");
  assert.match(FIXTURE, /raise exception 'restore mismatch/);
  assert.match(FIXTURE, /raise exception 'not idempotent/);
});

test("all three drain wrappers tag + audit student-path rows", () => {
  for (const name of ["fetch_questions", "fetch_questions_adaptive", "fetch_questions_public"]) {
    const fn = wrap(name);
    assert.ok(fn, `${name} def missing`);
    assert.match(fn, /practice\.leak_wm_tag\(/, `${name} must watermark rows`);
    assert.match(fn, new RegExp(`practice\\.log_fetch_audit\\('${name}'`), `${name} must audit under its own name`);
    assert.match(fn, /practice\.strip_bank_row\(/, `${name} must keep the keyless moat`);
  }
});

test("service_role bypass arms stay unmarked (pipeline is not a drain surface)", () => {
  for (const name of ["fetch_questions", "fetch_questions_adaptive"]) {
    const fn = wrap(name);
    const arm = fn.match(/service_role' then([\s\S]*?)return;/)?.[1] ?? "";
    assert.ok(arm, `${name} service_role arm not found`);
    assert.doesNotMatch(arm, /leak_wm_tag/, `${name} service_role rows must not be tagged`);
    assert.match(arm, /strip_bank_row/, `${name} service_role rows must still be keyless`);
  }
});

test("signature contracts preserved - public ticket param + grants", () => {
  const pub = wrap("fetch_questions_public");
  assert.match(pub, /p_guest_ticket text/, "public wrapper must keep the Turnstile ticket param");
  assert.match(pub, /verify_guest_ticket\(p_guest_ticket\)/, "public wrapper must keep the ticket check");
  assert.match(SRC, /grant execute on function practice\.fetch_questions_public[\s\S]*?to anon, authenticated, service_role/i);
  assert.match(SRC, /grant execute on function practice\.fetch_questions\([\s\S]*?to authenticated, service_role/i);
});
