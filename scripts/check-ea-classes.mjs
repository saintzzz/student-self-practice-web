// English Arena defect-class gate - deterministic checks for the classes
// the external review loop confirmed in r1-r4. Run: node scripts/check-ea-classes.mjs
// Every rule here exists because a review round proved the class real;
// fixing one site without the gate guarantees the class re-enters.
//
//   1. nondeterministic-generator  - Math.random() in gen scripts (r1 C: dupes)
//   2. open-cors                   - wildcard/bare-reflect ACAO on edge functions (r1 H)
//   3. committed-credentials       - PIN/password literals in committed files (r4 H)
//   4. mode-downgrade-fallback     - public fetch fallback dropping p_mode (r4 M)
//   5. starvation-sampling         - random()<0.35 prefilter without top-up pass (r4 M)
//   6. telemetry-batch-abort       - record_attempt_events atomic batch (r4 M)
//   7. push-silent-fail            - gen scripts swallowing push errors (r4 M)
//   8. audit-truncation            - audit fetches capped at limit=1000 (r4 M)
//   9. e2e-mock-incomplete         - SpeechRecognition deleted but MediaRecorder left (r4 L)
//  10. rls-verify-tables           - qb_verify*/qa_tokens without RLS (r4 M)
//  11. scope-fail-open             - allowed-grades read without enrollment scope (r5 class)
//  12. review-card-completeness    - review queue missing fields (r4 M)
//  13. service-role-in-client      - service key names inside src/ bundle (r3 H)
//  14. in-memory-rate-limit        - process-local Map rate limiting in edge fns (r3 H)
//  15. migration-grants            - anon usage / item_stats access path (r4 M)
//  16. migration-replay            - alter table on a relation no migration creates (r5 H)
//  17. fetch-gate-parity           - authenticated fetch missing exam/commercial gates (r5 M)
//  18. variant-dedupe              - two-pass fetch excluding ids not variant groups (r5 M)
//  19. stats-access-path           - item stats reachable without admin check (r5 M)
//  20. answer-shape-bool           - review card reading answer.bool only (r5 M)
//  21. last-admin-race             - admin count-then-delete without DB trigger (r5 M)
//  22. fk-auth-delete              - auth.users FK without ON DELETE semantics (r5 M)
//  23. guest-state-leak            - guest entry without parked owner blob (r5 M)
//  24. push-count-honesty          - attempted rows reported as inserted (r5 L)
//  25. session-shrink              - mapped-shortfall silently shortens session (r5 M)
//  26. skill-label-raw             - raw taxonomy keys rendered to parents (r5 L)
//  27. e2e-origin-vacuum           - same-origin gate blind to the backend origin (r5 L)
//  28. unverified-recipient        - child progress mailed to an unconfirmed address (r6 M)
//  29. email-html-injection        - user-controlled text raw into outbound email HTML (r6 M)
//  30. xff-spoofable               - rate-limit bucket keyed on caller-settable header entry (r6 M)
//  31. grant-shadow-column-revoke  - column-level revoke while the table-level grant stands (r7 H)
//  32. sql-cas-transition          - RPC status write without expected-status predicate (r7 M)
//  33. mic-lifecycle               - async mic capture/timer firing after unmount (r7 M)
//  34. provider-config-regression  - mailer bypassing the shared provider-aware sender (r7 M)
//  35. function-return-type-replay - create-or-replace changing return type without drop (r7 H)
//  36. verify-token-binding        - token stamped on a row whose email may have changed (r8 H)
//  37. verification-mail-quota     - resend throttle resettable via contact row edits (r8 M)
//  38. privilege-mutation-compat   - mutation payload wider than column grants -> RPC-bound writes (r8 M)
//  39. rpc-result-enum             - business result payload ignored as success (r8 M)
//  40. fetch-mode-parity           - public vs authenticated mode eligibility diverged (r8 M)
//  41. async-response-staleness    - superseded load responses overwriting newer state (r10 M)
//  42. priority-pagination-inversion - client priority sort after DB range slice (r10 M)
//  43. gate-orchestration-omission - preflight skipping the EA class gates (r10 M)
//  44. retry-nontransient-errors   - retrying permanent HTTP errors / sleeping after last try (r10 L)
//  45. mutation-view-context-race  - mutation applying to a view it did not start in (r11 M)
//  46. audit-runtime-portability   - audit secrets only from a local user path (r11 M)
//  47. scanner-selftest-exit-status - selftest swallowing the scanner exit code (r11 L)
//  48. audit-network-timeout       - audit fetch without a per-request timeout (r11 L)
//  49. auth-signout-error-loss     - signOut() {error} discarded as success (r13 M)
//  50. pagination-offset-after-mutation - last-page delete leaving an out-of-range offset (r13 L)
//  51. telemetry-owner-binding     - buffered events flushed under a switched identity (r14 M)
//  52. pre-start-time-accounting   - exam clock started before question assembly (r14 M)
//  53. orphaned-tool-imports       - script importing a module that no longer exists (r14 L)
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// EA_SCAN_ROOT: fixture tests quet mot cay gia thay vi repo that.
const BASE = process.env.EA_SCAN_ROOT
  ? resolve(process.env.EA_SCAN_ROOT)
  : ROOT;

const hits = [];
const hit = (cls, loc, msg) => hits.push({ cls, loc, msg });

function* walk(dir, exts) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (/node_modules|\.git|dist|vendor|fixtures/.test(e.name)) continue;
      yield* walk(p, exts);
    } else if (exts.test(e.name)) yield p;
  }
}
const rel = (p) => p.slice(BASE.length + 1);
const lineOf = (src, idx) => src.slice(0, idx).split("\n").length;

// ---------- 1. nondeterministic-generator ----------
for (const f of walk(join(BASE, "scripts"), /^gen-.*\.mjs$/)) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/Math\.random\s*\(/g))
    hit("nondeterministic-generator", `${rel(f)}:${lineOf(src, m.index)}`,
      "Math.random() - use seeded PRNG");
}

// ---------- 2. open-cors ----------
for (const f of walk(join(BASE, "supabase", "functions"), /\.ts$/)) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(
    /Access-Control-Allow-Origin['"]?\s*:\s*['"]([^'"]*)['"]/g,
  ))
    if (m[1] === "*")
      hit("open-cors", `${rel(f)}:${lineOf(src, m.index)}`, "wildcard ACAO");
  if (
    /Access-Control-Allow-Origin['"]?\s*:\s*origin\b/.test(src) &&
    !/allowed|allowlist/i.test(src)
  )
    hit("open-cors", rel(f), "reflects request origin without allowlist");
}

// ---------- 3. committed-credentials ----------
const CRED_RE =
  /(?:pin|password|passwd)\s*[:=]\s*['"`]([A-Za-z0-9!@#$%^&*]{4,})['"`]/gi;
const CRED_OK =
  /your-|example|placeholder|change_me|process\.env|\$\{|EA_PIN|EA_ADMIN/;
for (const f of walk(BASE, /\.(ts|tsx|mjs|js|md)$/)) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(CRED_RE)) {
    if (CRED_OK.test(m[1]) || CRED_OK.test(m[0])) continue;
    hit("committed-credentials", `${rel(f)}:${lineOf(src, m.index)}`,
      `literal credential value "${m[1].slice(0, 3)}..."`);
  }
}

// ---------- 4. mode-downgrade-fallback ----------
{
  const f = join(BASE, "src/lib/qb/bank.ts");
  if (existsSync(f)) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(
      /\.rpc\(['"]fetch_questions_public['"]\s*,\s*([^)]*)\)/g,
    )) {
      const arg = m[1];
      if (!/p_mode/.test(arg) && !/\bparams\b/.test(arg))
        hit("mode-downgrade-fallback", `${rel(f)}:${lineOf(src, m.index)}`,
          "public fetch without p_mode - silently downgrades exam to practice");
    }
    // params object itself must carry p_mode
    if (/p_mode:\s*mode/.test(src) === false && /fetch_questions_public/.test(src))
      hit("mode-downgrade-fallback", rel(f), "params literal missing p_mode: mode");
  }
}

// ---------- 5+6+15. migration invariants ----------
{
  const migDir = join(BASE, "supabase", "migrations");
  const mig = [...walk(migDir, /\.sql$/)]
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
  if (mig.length) {
    // 5. starvation-sampling: any fetch_questions* function with a random()
    //    prefilter must contain a top-up pass (second insert / topup marker).
    const fetchDefs = new Map();
    for (const m of mig.matchAll(
      /create or replace function\s+practice\.(fetch_questions\w*)\([\s\S]*?as\s+\$\$([\s\S]*?)\$\$\s*;/gi,
    ))
      fetchDefs.set(m[1], m[2]); // latest definition wins
    for (const [name, body] of fetchDefs) {
      if (/random\(\)\s*</.test(body) && !/top.?up|second pass|topup|if\s+got\s*<\s*\w+|remaining/i.test(body))
        hit("starvation-sampling", "supabase/migrations",
          `${name} has random() prefilter without a top-up pass`);
    }
    // 6. telemetry-batch-abort: record_attempt_events must iterate elements
    //    with per-element exception isolation.
    // latest definition wins - earlier migrations may redefine it.
    const telemDefs = [...mig.matchAll(
      /create or replace function\s+practice\.record_attempt_events[\s\S]*?as\s+\$\$([\s\S]*?)\$\$\s*;/gi,
    )];
    const telem = telemDefs.at(-1)?.[0] ?? "";
    if (!/jsonb_array_elements|loop/i.test(telem) || !/exception/i.test(telem))
      hit("telemetry-batch-abort", "supabase/migrations",
        "record_attempt_events lacks per-element loop + exception isolation");
    // 10. rls-verify-tables
    for (const t of ["qb_verify_todo", "qb_verify_verdicts", "qa_tokens"])
      if (!new RegExp(`alter table\\s+practice\\.${t}\\s+enable row level security`, "i").test(mig))
        hit("rls-verify-tables", "supabase/migrations", `${t} missing RLS enable`);
    // 15. grants
    if (!/grant usage on schema practice to anon/i.test(mig))
      hit("migration-grants", "supabase/migrations", "anon missing schema usage grant");
    // 16. migration-replay: every bare `alter table practice.X` must have a
    //     `create table practice.X` in the corpus - otherwise a fresh
    //     replay dies on a relation that only exists on the deployed DB.
    const created = new Set(
      [...mig.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?practice\.(\w+)/gi)]
        .map((m) => m[1].toLowerCase()),
    );
    for (const m of mig.matchAll(/alter\s+table\s+(?!if\s+exists)practice\.(\w+)/gi)) {
      if (!created.has(m[1].toLowerCase()))
        hit("migration-replay", `supabase/migrations:${lineOf(mig, m.index)}`,
          `alter table practice.${m[1]} without any create table - replay fails`);
    }
    // 17. fetch-gate-parity: every fetch_questions* definition must apply
    //     the full commercial+exam approval gates, not a subset.
    for (const [name, body] of fetchDefs) {
      for (const gate of ["commercialReleaseEligible", "requiresHumanApprovalForExam", "requiresHumanApprovalForCommercialRelease"])
        if (!body.includes(gate))
          hit("fetch-gate-parity", "supabase/migrations", `${name} missing gate ${gate}`);
      // 18. variant-dedupe: pass-2 exclusion must exclude the variant
      //     GROUP key, not just the already-returned row id.
      if (/= any\(seen\)/.test(body) && !/not \(coalesce\(q\.variant_group_id,\s*q\.id\)\s*=\s*any\(seen\)\)/.test(body))
        hit("variant-dedupe", "supabase/migrations",
          `${name} second pass excludes row ids only - same variant group can repeat`);
      if (!/seen\s*:=\s*seen\s*\|\|\s*coalesce\(/.test(body))
        hit("variant-dedupe", "supabase/migrations",
          `${name} tracks row ids in seen, not variant-group keys`);
    }
    // 19. stats-access-path: item stats must go through the admin-checked
    //     RPC; the invoker view must not be directly selectable by
    //     authenticated users.
    if (!/create or replace function\s+practice\.qb_item_stats_for/i.test(mig) ||
        !/qb_item_stats_for[\s\S]{0,600}?is_admin\(\)/i.test(mig))
      hit("stats-access-path", "supabase/migrations",
        "qb_item_stats_for admin-checked RPC missing");
    if (!/revoke\s+select\s+on\s+practice\.qb_item_stats\s+from\s+authenticated/i.test(mig))
      hit("stats-access-path", "supabase/migrations",
        "authenticated direct select on qb_item_stats not revoked");
    // 21. last-admin-race: the invariant must live in the DB - a trigger
    //     serialized by an advisory lock, not the edge fn's count-then-delete.
    if (!/practice\.guard_last_admin[\s\S]{0,800}?pg_advisory_xact_lock/i.test(mig) ||
        !/before\s+delete\s+on\s+practice\.accounts/i.test(mig))
      hit("last-admin-race", "supabase/migrations",
        "no DB-serialized last-admin delete guard");
    // 22. fk-auth-delete: telemetry/audit FKs to auth.users must declare
    //     deletion semantics or account deletion deadlocks.
    for (const t of ["qb_attempt_events", "qb_adaptive_decisions", "audit_log", "qb_review_events"])
      if (!new RegExp(`practice\\.${t}[\\s\\S]{0,500}?on delete (cascade|set null)`, "i").test(mig))
        hit("fk-auth-delete", "supabase/migrations",
          `${t} -> auth.users FK lacks ON DELETE semantics`);
    // 28. unverified-recipient: weekly child-progress mail must only go to
    //     click-confirmed addresses; a confirm RPC + server-owned verified
    //     column must exist, and the send loop must filter on it.
    const reportDefs = [...mig.matchAll(
      /create or replace function\s+practice\.send_weekly_reports[\s\S]*?as\s+\$\$([\s\S]*?)\$\$\s*;/gi,
    )];
    const report = reportDefs.at(-1)?.[1] ?? "";
    if (reportDefs.length && !/pc\.verified/.test(report))
      hit("unverified-recipient", "supabase/migrations",
        "send_weekly_reports does not filter on verified recipients");
    if (/parent_contacts/.test(mig)) {
      if (!/create or replace function\s+practice\.confirm_parent_email/i.test(mig))
        hit("unverified-recipient", "supabase/migrations",
          "no confirm_parent_email RPC - recipients cannot prove ownership");
      if (!/verified\s+boolean/.test(mig))
        hit("unverified-recipient", "supabase/migrations",
          "parent_contacts lacks a verified flag");
      if (!/revoke (insert|update) \(verified/.test(mig))
        hit("unverified-recipient", "supabase/migrations",
          "verified column is client-writable - self-verification possible");
    }
    // 29. email-html-injection: user-controlled text concatenated straight
    //     into an outbound mail body/subject must pass through email_esc()
    //     (read into a local first, then interpolate the escaped value).
    const mailDefs = new Map();
    for (const d of mig.matchAll(
      /create or replace function\s+practice\.(send_weekly_reports|request_parent_verify|reconcile_parent_reports)[\s\S]*?as\s+\$\$([\s\S]*?)\$\$\s*;/gi,
    ))
      mailDefs.set(d[1].toLowerCase(), d[0]); // latest definition wins
    for (const [name, body] of mailDefs) {
      for (const m of body.matchAll(/\|\|\s*\w+\.(display_name|full_name|student_name)/g)) {
        hit("email-html-injection", "supabase/migrations",
          `${name}: ${m[0].trim()} concatenated into email without email_esc()`);
      }
      // 34. provider-config-regression: outbound mail must route through the
      //     shared provider-aware sender. A mailer that posts to a provider
      //     API or reads vault keys directly has dropped the provider matrix.
      if (/create or replace function\s+practice\.send_email\(/i.test(mig) &&
          /net\.http_post|decrypted_secrets/.test(body))
        hit("provider-config-regression", "supabase/migrations",
          `${name} posts mail directly - provider matrix bypassed, use practice.send_email`);
    }
    // 31. grant-shadow-column-revoke: `revoke update (col) on T from R` does
    //     NOT narrow a table-level `grant update on T to R` - privileges are
    //     unioned in Postgres. Every column revoke needs the same-privilege
    //     table-level revoke somewhere in the corpus.
    const tableRevokes = new Set();
    for (const m of mig.matchAll(
      /revoke\s+([a-z, \t]+?)[ \t]+on\s+(practice\.\w+)\s+from\s+(\w+)/gi,
    )) {
      if (m[1].includes("(")) continue;
      for (const priv of m[1].split(",").map((s) => s.trim().toLowerCase())) {
        if (priv === "all" || priv === "all privileges") {
          for (const p of ["select", "insert", "update", "delete"])
            tableRevokes.add(`${p}|${m[2]}|${m[3].toLowerCase()}`);
        } else {
          tableRevokes.add(`${priv}|${m[2]}|${m[3].toLowerCase()}`);
        }
      }
    }
    for (const m of mig.matchAll(
      /revoke\s+(insert|update|select|delete)\s*\([^)]+\)\s+on\s+(practice\.\w+)\s+from\s+(\w+)/gi,
    )) {
      if (!tableRevokes.has(`${m[1].toLowerCase()}|${m[2]}|${m[3].toLowerCase()}`))
        hit("grant-shadow-column-revoke", "supabase/migrations",
          `column revoke ${m[1]} on ${m[2]} without a table-level revoke - the table grant still applies`);
    }
    // 36+37. verify-token-binding / verification-mail-quota: the verify
    //     mail flow must lock the contact row across read->send->stamp (an
    //     interleaved email change can otherwise bind the token to a
    //     different address), and the resend quota must live on a
    //     row-independent table or contact edits reset it.
    const verifyDefs = [...mig.matchAll(
      /create or replace function\s+practice\.request_parent_verify[\s\S]*?as\s+\$\$([\s\S]*?)\$\$\s*;/gi,
    )];
    const verifyBody = verifyDefs.at(-1)?.[1] ?? "";
    if (verifyDefs.length && !/for update/i.test(verifyBody))
      hit("verify-token-binding", "supabase/migrations",
        "request_parent_verify reads+stamps the token without a row lock - token can bind to a changed email");
    if (verifyDefs.length && !/verify_send_log/.test(verifyBody))
      hit("verification-mail-quota", "supabase/migrations",
        "resend quota reads the contact row only - email change or delete+reinsert resets the throttle");
    if (/verify_send_log/.test(mig) && !/create table[^;]*practice\.verify_send_log/i.test(mig))
      hit("verification-mail-quota", "supabase/migrations",
        "verify_send_log referenced but never created");
    // 40. fetch-mode-parity: public and authenticated fetches must apply
    //     the SAME per-mode eligibility predicate; public mapping exam ->
    //     mockEligible while auth uses examEligible diverges row sets.
    const pubDefs = [...mig.matchAll(
      /create or replace function\s+practice\.fetch_questions_public[\s\S]*?as\s+\$\$([\s\S]*?)\$\$\s*;/gi,
    )];
    const pubBody = pubDefs.at(-1)?.[1] ?? "";
    if (pubDefs.length && !/p_mode\s*=\s*'exam'[\s\S]{0,400}?examEligible/i.test(pubBody))
      hit("fetch-mode-parity", "supabase/migrations",
        "public fetch exam arm does not use examEligible - diverges from the authenticated fetch");
    // 32. sql-cas-transition: a status machine write must predicate on the
    //     expected prior status, or a stale transition resurrects terminal
    //     rows. review_question is the queue's transition RPC.
    const reviewDefs = [...mig.matchAll(
      /create or replace function\s+practice\.review_question[\s\S]*?as\s+\$\$([\s\S]*?)\$\$\s*;/gi,
    )];
    const review = reviewDefs.at(-1)?.[1] ?? "";
    if (reviewDefs.length && !/review_status\s+in\s*\(/i.test(review))
      hit("sql-cas-transition", "supabase/migrations",
        "review_question transitions without an expected-status predicate - stale writes can resurrect terminal states");
    // 35. function-return-type-replay: `create or replace` cannot change a
    //     function's return type - Postgres errors on fresh replay. When a
    //     later migration redefines a function with a different `returns`,
    //     it must drop the function first.
    const sigSeen = new Map();
    const migFiles = [...walk(migDir, /\.sql$/)].sort();
    for (const f of migFiles) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(
        /create or replace function\s+(?:practice\.)?(\w+)\s*\([^)]*\)[\s\S]*?returns\s+(setof\s+\w+|table\s*\([^)]*\)|[a-z_][\w]*(?:\[\])?)/gi,
      )) {
        const key = m[1].toLowerCase();
        const ret = m[2].toLowerCase().replace(/\s+/g, "");
        const droppedBefore = new RegExp(
          `drop\\s+function\\s+(?:if\\s+exists\\s+)?(?:practice\\.)?${key}\\b`, "i",
        ).test(src.slice(0, m.index));
        if (sigSeen.has(key) && sigSeen.get(key) !== ret && !droppedBefore)
          hit("function-return-type-replay", `${rel(f)}:${lineOf(src, m.index)}`,
            `${key} redefined returns ${sigSeen.get(key)} -> ${ret} without drop function - fresh replay fails`);
        sigSeen.set(key, ret);
      }
    }
  }
}

// ---------- 7. push-silent-fail ----------
// A script that posts to PostgREST but never exits non-zero on failure.
for (const f of walk(join(BASE, "scripts"), /^gen-.*\.mjs$/)) {
  const src = readFileSync(f, "utf8");
  const pushes = /fetch\([^)]*method:\s*['"]?(POST|post)['"]?|rest\/v1/.test(src);
  if (pushes && !/process\.exit\(1\)|process\.exitCode/.test(src))
    hit("push-silent-fail", rel(f), "no non-zero exit on push failure");
  if (/res\.ok/.test(src) === false && pushes)
    hit("push-silent-fail", rel(f), "push response status never checked");
}

// ---------- 8. audit-truncation ----------
// Every audit read of a >1000-row table must paginate (offset/range loop).
{
  const f = join(BASE, "scripts", "audit-bank.mjs");
  if (existsSync(f)) {
    const src = readFileSync(f, "utf8");
    const urls = [...src.matchAll(/rest\/v1\/qb_questions\?[^`'"]*/g)].map((m) => m[0]);
    for (const u of urls) {
      if (/limit=\d+/.test(u) && !/offset=|range=|limit=0\b/.test(u))
        hit("audit-truncation", rel(f),
          `unpaginated fetch: ${u.slice(0, 90)}`);
    }
    if (!/offset=\$\{off\}|\.range\(/.test(src))
      hit("audit-truncation", rel(f), "no offset/range pagination loop");
  }
}

// ---------- 9. e2e-mock-incomplete ----------
// Deleting SpeechRecognition while leaving MediaRecorder means the
// recorder fallback path still runs and the spec never hits unsupported.
for (const f of walk(join(BASE, "e2e"), /\.spec\.ts$/)) {
  const src = readFileSync(f, "utf8");
  const delSpeech = /delete\s+window\.(webkit)?SpeechRecognition|delete\s+\(?window[^)]*\)\.?(webkit)?SpeechRecognition/.test(src);
  const delMedia = /delete\s+window\.MediaRecorder|delete\s+\(?window[^)]*\)\.?MediaRecorder/.test(src);
  if (delSpeech && !delMedia)
    hit("e2e-mock-incomplete", rel(f),
      "deletes SpeechRecognition but MediaRecorder fallback still active");
}

// ---------- 11. scope-fail-open ----------
// fetchMyAllowedGrades must resolve through the student's enrollments -
// reading the whole scopes table leaks every class's scope.
{
  const f = join(BASE, "src/lib/auth/practiceAuth.ts");
  if (existsSync(f)) {
    const src = readFileSync(f, "utf8");
    const fn = /fetchMyAllowedGrades[\s\S]*?\n}/.exec(src)?.[0] ?? "";
    if (/from\(['"]class_grade_scopes['"]\)\s*\.select/.test(fn) &&
        !/\.eq\(['"]student_id|\.in\(['"]class_id/.test(fn))
      hit("scope-fail-open", rel(f),
        "allowed-grades read unscoped - returns every class scope");
  }
}

// ---------- 12. review-card-completeness ----------
{
  const f = join(BASE, "src/components/ReviewQueueCard.tsx");
  if (existsSync(f)) {
    const src = readFileSync(f, "utf8");
    for (const field of ["passage", "statement", "tokens", "explanation_vi", "choices"])
      if (!src.includes(field))
        hit("review-card-completeness", rel(f), `reviewer card missing field "${field}"`);
  }
}

// ---------- 13. service-role-in-client ----------
for (const f of walk(join(BASE, "src"), /\.(ts|tsx)$/)) {
  const src = readFileSync(f, "utf8");
  if (/service_role|SERVICE_ROLE|service-role/i.test(src))
    hit("service-role-in-client", rel(f), "service-role key reference inside client bundle");
}

// ---------- 14. in-memory-rate-limit ----------
for (const f of walk(join(BASE, "supabase", "functions"), /\.ts$/)) {
  const src = readFileSync(f, "utf8");
  if (/rate.?limit/i.test(src) && /new Map\s*\(/.test(src) && !/check_rate_limit|pg_catalog/i.test(src))
    hit("in-memory-rate-limit", rel(f),
      "process-local Map rate limiting - shared state lost across isolates");
}

// ---------- 20. answer-shape-bool ----------
// Generated T/F rows store answer.boolean; a card reading answer.bool
// only renders nothing for them (r5).
{
  const f = join(BASE, "src/components/ReviewQueueCard.tsx");
  if (existsSync(f)) {
    const src = readFileSync(f, "utf8");
    if (/answer\?*\.bool\b/.test(src) && !/answer\?*\.boolean\b/.test(src))
      hit("answer-shape-bool", rel(f),
        "reads answer.bool only - generated rows use answer.boolean");
  }
}

// ---------- 33. mic-lifecycle ----------
// A hook that awaits mic permission or schedules a retry timer must guard
// every post-await post-timer step against unmount - otherwise capture
// attaches, retries relaunch, or onAttempt fires after the child left.
for (const f of walk(join(BASE, "src", "hooks"), /\.tsx?$/)) {
  const src = readFileSync(f, "utf8");
  if (/await\s+startAudioRecording\(|await\s+startSpeechRecognition\(/.test(src) &&
      !/unmountedRef|isMountedRef|cancelledRef/.test(src))
    hit("mic-lifecycle", rel(f),
      "mic capture promise resolves with no unmount guard - capture can attach after unmount");
  // r8 tightening: the flag must be re-armed in setup (StrictMode replays
  // mount->cleanup->mount) and every launch/fallback path must check it.
  if (/unmountedRef/.test(src) && !/unmountedRef\.current\s*=\s*false/.test(src))
    hit("mic-lifecycle", rel(f),
      "unmountedRef never re-armed in setup - StrictMode replay kills the second mount");
}
{
  // A captured stream must be released if any init step after
  // getUserMedia throws - the caller never gets a controller to cancel.
  const ar = join(BASE, "src/lib/audioRecording.ts");
  if (existsSync(ar)) {
    const src = readFileSync(ar, "utf8");
    if (/new MediaRecorder/.test(src) &&
        !/new MediaRecorder[\s\S]{0,600}?catch[\s\S]{0,400}?track\.stop\(\)/.test(src))
      hit("mic-lifecycle", rel(ar),
        "MediaRecorder constructor failure leaks the mic stream - no track.stop() in a catch");
    // r9 tightening: start() can also throw after construction succeeds -
    // the caller never receives a controller, so the catch must release.
    if (/recorder\.start\(\)/.test(src) &&
        !/try\s*{[^}]*recorder\.start\(\)[\s\S]{0,600}?catch[\s\S]{0,300}?(release\(\)|track\.stop\(\))/.test(src))
      hit("mic-lifecycle", rel(ar),
        "MediaRecorder.start() failure leaks the mic stream - no release() in a catch");
    // r10 tightening: if VAD init throws after new AudioContext() but
    // before vadStop is wired, release() cannot reach the context - the
    // catch must close a partially-initialized context itself.
    if (/new AudioContext/.test(src) &&
        !/new AudioContext[\s\S]{0,3000}?catch\s*{[\s\S]{0,500}?close\(/.test(src))
      hit("mic-lifecycle", rel(ar),
        "partial VAD init leaks the AudioContext - catch never closes it");
  }
}

// ---------- 38. privilege-mutation-compat ----------
// A PostgREST upsert/insert/update payload must fit inside the column
// grants; ON CONFLICT DO UPDATE checks UPDATE on EVERY payload column,
// so payloads wider than the granted set 403 even though the row would
// be RLS-legal. Ownership-bound writes route through the RPC.
{
  const pc = join(BASE, "src/lib/parentContact.ts");
  if (existsSync(pc)) {
    const src = readFileSync(pc, "utf8");
    if (/\.from\(\s*['"]parent_contacts['"]\s*\)\s*\.(upsert|insert|update)/.test(src) ||
        !/rpc\(\s*['"]save_parent_contact['"]/.test(src))
      hit("privilege-mutation-compat", rel(pc),
        "direct parent_contacts write whose payload exceeds column grants - saves must use save_parent_contact RPC");
  }
}

// ---------- 39. rpc-result-enum ----------
// A security-definer RPC returning a business payload ({ok, stale,...})
// over HTTP-200 is not a transport error - callers that only read
// `error` report denied actions as successes.
{
  const rqc = join(BASE, "src/components/ReviewQueueCard.tsx");
  if (existsSync(rqc)) {
    const src = readFileSync(rqc, "utf8");
    if (/rpc\(\s*['"]review_question['"]/.test(src) && !/stale/.test(src))
      hit("rpc-result-enum", rel(rqc),
        "review_question {stale} result unchecked - denied CAS writes look like successes");
    // r9 tightening: a null/malformed payload over HTTP-200 must not pass
    // as success - require an explicit ok===true/ok!==true assertion.
    if (/rpc\(\s*['"]review_question['"]/.test(src) && !/ok\s*(!==|===)\s*true/.test(src))
      hit("rpc-result-enum", rel(rqc),
        "review_question payload without explicit ok===true gate - ambiguous result treated as success");
  }
  const prs = join(BASE, "src/components/ParentReportScreen.tsx");
  if (existsSync(prs)) {
    const src = readFileSync(prs, "utf8");
    if (/requestParentVerify/.test(src) && !/throttled/.test(src))
      hit("rpc-result-enum", rel(prs),
        "verify-mail result states (sent/throttled/failed) never surfaced - a failed enqueue looks saved");
  }
}

// ---------- 23. guest-state-leak ----------
{
  const app = join(BASE, "src/App.tsx");
  const sync = join(BASE, "src/lib/engagement/sync.ts");
  if (existsSync(app)) {
    const src = readFileSync(app, "utf8");
    if (/function\s+handleGuest|handleGuest\s*=\s*(?:async\s*)?\(/.test(src) &&
        !/parkOwnerBlob/.test(src))
      hit("guest-state-leak", rel(app),
        "guest entry does not park an account-owned blob");
  }
  if (existsSync(sync)) {
    const src = readFileSync(sync, "utf8");
    if (/bindEngagement/.test(src) && !/restoreParkedBlob/.test(src))
      hit("guest-state-leak", rel(sync),
        "bindEngagement never restores a parked owner blob - recovery lost");
  }
}

// ---------- 24. push-count-honesty ----------
// A zero insert count must stay zero; an unparsable content-range must
// fail, never silently become the attempted batch size.
for (const f of walk(join(BASE, "scripts"), /^gen-.*\.mjs$/)) {
  const src = readFileSync(f, "utf8");
  if (!/rest\/v1/.test(src)) continue;
  if (/split\(['"]\/['"]\)\[1\]\)\s*\|\|/.test(src))
    hit("push-count-honesty", `${rel(f)}:${lineOf(src, src.indexOf("||"))}`,
      "content-range count OR-ed with attempted size - 0 becomes batch length");
  for (const m of src.matchAll(/Prefer:\s*['"]([^'"]*)['"]/g)) {
    if (/resolution=ignore-duplicates/.test(m[1]) && !/count=exact/.test(m[1]))
      hit("push-count-honesty", `${rel(f)}:${lineOf(src, m.index)}`,
        "insert without count=exact - inserted count is guesswork");
  }
}

// ---------- 25. session-shrink ----------
{
  const f = join(BASE, "src/lib/qb/bank.ts");
  if (existsSync(f)) {
    const src = readFileSync(f, "utf8");
    if (!/poolShort|droppedCount/.test(src))
      hit("session-shrink", rel(f),
        "no shortfall surfacing - malformed rows silently shrink sessions");
  }
  const ui = join(BASE, "src/components/ExamScreen.tsx");
  if (existsSync(ui)) {
    const src = readFileSync(ui, "utf8");
    if (!/poolShort|droppedCount/.test(src))
      hit("session-shrink", rel(ui),
        "session shortfall flags never rendered");
  }
}

// ---------- 26. skill-label-raw ----------
{
  const f = join(BASE, "src/components/ParentReportScreen.tsx");
  if (existsSync(f)) {
    const src = readFileSync(f, "utf8");
    if (/SKILL_LABELS\[/.test(src) && !/skillLabel\(/.test(src))
      hit("skill-label-raw", rel(f),
        "indexes SKILL_LABELS directly - qb taxonomy keys leak raw");
  }
  const skills = join(BASE, "src/lib/engagement/skills.ts");
  if (existsSync(skills)) {
    const src = readFileSync(skills, "utf8");
    for (const k of ["arithmetic", "word-problem", "concept", "classification", "application", "writing"])
      if (!src.includes(`'${k}':`))
        hit("skill-label-raw", rel(skills), `no Vietnamese label for skill '${k}'`);
  }
}

// ---------- 30. xff-spoofable ----------
// Rate-limit buckets keyed on the FIRST x-forwarded-for entry (or a
// caller-set cf-connecting-ip preferred over it) can be rotated by the
// client. The ingress-appended LAST entry is the trustworthy one (r6).
for (const f of walk(join(BASE, "supabase", "functions"), /\.ts$/)) {
  const src = readFileSync(f, "utf8");
  if (!/x-forwarded-for/.test(src)) continue;
  if (/split\(['"],['"]\)\s*\[\s*0\s*\]|split\(['"],['"]\)\.shift\(\)/.test(src))
    hit("xff-spoofable", rel(f),
      "first x-forwarded-for entry used - caller can prepend fake hops");
  if (/cf-connecting-ip.*\?\?|cf-connecting-ip.*\|\|/.test(src) &&
      !/xff|x-forwarded|\.pop\(\)|at\(-1\)/.test(src))
    hit("xff-spoofable", rel(f),
      "cf-connecting-ip preferred with no last-hop fallback");
}

// ---------- 27. e2e-origin-vacuum ----------
{
  const f = join(BASE, "e2e", "same-origin.spec.ts");
  if (existsSync(f)) {
    const src = readFileSync(f, "utf8");
    if (!/VITE_SUPABASE_URL/.test(src))
      hit("e2e-origin-vacuum", rel(f),
        "same-origin gate ignores the configured backend origin");
  }
}

// ---------- 41. async-response-staleness ----------
// A filter/pagination-driven loader must invalidate superseded requests -
// an out-of-order response writing state displays the old filter's rows
// under the new one.
{
  const rqc = join(BASE, "src/components/ReviewQueueCard.tsx");
  if (existsSync(rqc)) {
    const src = readFileSync(rqc, "utf8");
    if (/useCallback\(async/.test(src) && /\.range\(/.test(src) &&
        !/loadGenRef|alive\(\)|AbortController|requestId|generation/.test(src))
      hit("async-response-staleness", rel(rqc),
        "multi-await loader writes state with no request-generation guard");
    // r11 tightening: a generation counter is only half the fix - the
    // effect must also invalidate in-flight requests on cleanup/unmount.
    if (/loadGenRef/.test(src) &&
        !/return\s*\(\)\s*=>[\s\S]{0,120}?(loadGenRef\.current\+\+|\+\+loadGenRef|\.abort\(\))/.test(src))
      hit("async-response-staleness", rel(rqc),
        "generation never bumped on effect cleanup - unmount leaves stale writes alive");
    // r12 tightening: a successful mutation must also bump the epoch so
    // an in-flight load cannot restore a pre-mutation snapshot. Requires
    // a SECOND bump site besides the effect cleanup.
    const bumps = [...src.matchAll(/loadGenRef\.current\s*\+\+|\+\+\s*loadGenRef\.current/g)];
    if (/loadGenRef/.test(src) && bumps.length < 2)
      hit("async-response-staleness", rel(rqc),
        "successful mutation does not invalidate pending loads - stale snapshot can restore the row");
  }
}

// ---------- 42. priority-pagination-inversion ----------
// Sorting the page AFTER .range() is not global ordering - priority must
// be part of the DB ORDER BY so high-priority rows surface on page 1.
{
  const rqc = join(BASE, "src/components/ReviewQueueCard.tsx");
  if (existsSync(rqc)) {
    const src = readFileSync(rqc, "utf8");
    if (/from\(\s*['"]qb_review_queue['"]/.test(src) &&
        !/\.order\(\s*['"]priority['"][^)]*\)[\s\S]{0,200}?\.range\(/.test(src))
      hit("priority-pagination-inversion", rel(rqc),
        "page sliced before priority sort - queue is not globally priority-ordered");
  }
}

// ---------- 43. gate-orchestration-omission ----------
// Every deterministic scanner must run through every gate entry point -
// a preflight that only covers one scanner leaves the others unenforced.
{
  const pf = join(BASE, "scripts", "preflight.sh");
  const ea = join(BASE, "scripts", "check-ea-classes.mjs");
  if (existsSync(pf) && existsSync(ea)) {
    const src = readFileSync(pf, "utf8");
    if (!/code:reliability|check-ea-classes/.test(src))
      hit("gate-orchestration-omission", rel(pf),
        "preflight omits the EA class gates - standalone path enforces only one scanner");
  }
}

// ---------- 44. retry-nontransient-errors ----------
// A fetch retry loop must retry transient statuses only (408/429/5xx) -
// retrying a permanent 4xx wastes attempts and masks the real failure.
{
  const ab = join(BASE, "scripts", "audit-bank.mjs");
  if (existsSync(ab)) {
    const src = readFileSync(ab, "utf8");
    if (/fetchRetry|for\s*\(let i\s*=\s*0;\s*i\s*<\s*4/.test(src) &&
        !(/408/.test(src) && /429/.test(src) && /[<>]=?\s*500/.test(src)))
      hit("retry-nontransient-errors", rel(ab),
        "retry loop has no transient-status guard - 4xx responses are retried");
  }
}

// ---------- 45. mutation-view-context-race ----------
// An async mutation resolving after the reviewer switched filter/page
// must not mutate the new view's list or count - capture the view at
// action start and reload when it no longer matches.
{
  const rqc = join(BASE, "src/components/ReviewQueueCard.tsx");
  if (existsSync(rqc)) {
    const src = readFileSync(rqc, "utf8");
    // r12 tightening: comparing captured VALUES is ABA-unsafe (view can
    // leave and return to the same filter) - the guard must be a
    // monotonic epoch captured before the RPC.
    if (/rpc\(\s*['"]review_question['"]/.test(src) && /setTotal/.test(src) &&
        !/genAtStart|viewEpoch|epochAtStart/.test(src))
      hit("mutation-view-context-race", rel(rqc),
        "mutation success path lacks an epoch guard - ABA view switches are undetected");
  }
}

// ---------- 46. audit-runtime-portability ----------
// A gate script hard-coding a developer-home secret path cannot run in
// CI or on another machine - env config must come first, file optional.
{
  const ab = join(BASE, "scripts", "audit-bank.mjs");
  if (existsSync(ab)) {
    const src = readFileSync(ab, "utf8");
    if (/homedir\(\)[\s\S]{0,200}?secrets/.test(src) && !/process\.env\.[A-Z_]*(URL|KEY)/.test(src))
      hit("audit-runtime-portability", rel(ab),
        "audit reads secrets only from a dev-home path - no env configuration path");
  }
}

// ---------- 47. scanner-selftest-exit-status ----------
// A selftest that swallows the scanner exit code can pass a scanner that
// prints the success marker yet exits nonzero - assert the code too.
for (const st of ["tests/ea-classes-scanner.selftest.mjs", "tests/reliability-scanner.selftest.mjs"]) {
  const f = join(BASE, st);
  if (existsSync(f)) {
    const src = readFileSync(f, "utf8");
    if (/execFileSync/.test(src) && !/(e\.status|status\s*\?\?|code,)/.test(src))
      hit("scanner-selftest-exit-status", rel(f),
        "scan() swallows the scanner exit code - nonzero exits are not asserted");
    // r12 tightening: BOTH polarities must be asserted - a single
    // nonzero assert leaves the passing path (good fixture/repo)
    // uncovered.
    if (/execFileSync/.test(src) &&
        (!/assert\.notEqual\(code,\s*0/.test(src) || !/assert\.equal\(code,\s*0/.test(src)))
      hit("scanner-selftest-exit-status", rel(f),
        "exit-code assertions must cover both the failing and passing scan paths");
  }
}

// ---------- 48. audit-network-timeout ----------
// A retry loop without a per-request deadline blocks the audit forever
// on a hung connection - AbortSignal.timeout bounds each attempt.
{
  const ab = join(BASE, "scripts", "audit-bank.mjs");
  if (existsSync(ab)) {
    const src = readFileSync(ab, "utf8");
    if (/fetchRetry|await fetch\(/.test(src) && !/AbortSignal|signal\s*:/.test(src))
      hit("audit-network-timeout", rel(ab),
        "fetch has no per-request timeout - a hung request blocks the audit");
  }
}

// ---------- 49. auth-signout-error-loss ----------
// supabase signOut() reports failure through { error }, not a throw -
// discarding it makes a failed logout look like a successful one.
for (const f of walk(join(BASE, "src"), /\.tsx?$/)) {
  const src = readFileSync(f, "utf8");
  if (!/signOut\s*\(\s*\)/.test(src)) continue;
  if (!/signOut[\s\S]{0,200}?\berror\b|error[\s\S]{0,100}?signOut/.test(src))
    hit("auth-signout-error-loss", rel(f),
      "signOut() result unchecked - failed logout resolves like success");
}

// ---------- 50. pagination-offset-after-mutation ----------
// Removing the last row of a later page leaves the offset out of range -
// the mutation path must reconcile the offset before the next load.
{
  const rqc = join(BASE, "src/components/ReviewQueueCard.tsx");
  if (existsSync(rqc)) {
    const src = readFileSync(rqc, "utf8");
    if (/setRows\(\(prev\)\s*=>/.test(src) && /setTotal/.test(src) &&
        !/setTotal[\s\S]{0,300}?setOffset\(/.test(src))
      hit("pagination-offset-after-mutation", rel(rqc),
        "row removal never reconciles offset - last-page delete shows an empty queue");
  }
}

// ---------- 23b. variant-dedupe (client top-up) ----------
// The server dedupes variant groups within ONE draw only. A client
// top-up draw can re-serve the same variant_group_id under a different
// row id, so the client must exclude extras by the variant key before
// mapping drops it.
{
  const bank = join(BASE, "src/lib/qb/bank.ts");
  if (existsSync(bank)) {
    const src = readFileSync(bank, "utf8");
    if (/\bextra\b[\s\S]{0,400}?pickUnseenFirst/.test(src) &&
        !/variant_group_id\s*\?\?\s*\w+\.id/.test(src))
      hit("variant-dedupe", rel(bank),
        "top-up excludes only row ids - a second draw can repeat a variant group");
  }
}

// ---------- 51. telemetry-owner-binding ----------
// Buffered attempt events must be bound to the identity captured at
// creation; flushing under a changed session re-attributes them.
{
  const tel = join(BASE, "src/lib/qb/telemetry.ts");
  if (existsSync(tel)) {
    const src = readFileSync(tel, "utf8");
    if (!/owner(Promise|Id|Key)/.test(src) ||
        !/session\??\.user\?\.id|session\.user\.id/.test(src))
      hit("telemetry-owner-binding", rel(tel),
        "flush() does not compare the live session user to a stored owner");
  }
}

// ---------- 52. pre-start-time-accounting ----------
// The exam clock must start after assembly. A caller timestamp captured
// before the fetches lets question loading consume exam time.
{
  const bank = join(BASE, "src/lib/qb/bank.ts");
  if (existsSync(bank)) {
    const src = readFileSync(bank, "utf8");
    if (/createExamFromBank[\s\S]{0,300}?\bnowMs\b/.test(src) ||
        /startedAtMs:\s*nowMs/.test(src))
      hit("pre-start-time-accounting", rel(bank),
        "startedAtMs comes from a pre-fetch caller timestamp");
  }
  for (const f of walk(join(BASE, "src"), /\.tsx?$/)) {
    const src = readFileSync(f, "utf8");
    if (/createExamFromBank\([^)]*Date\.now\(\)/.test(src))
      hit("pre-start-time-accounting", rel(f),
        "Date.now() passed before the await - loading eats exam time");
  }
}

// ---------- 53. orphaned-tool-imports ----------
// Every relative import in a bundled/CLI script must resolve - a
// deleted module leaves the tool crashing on run.
{
  const dir = join(BASE, "scripts");
  const exts = [".ts", ".tsx", ".js", ".mjs", ".json"];
  const resolves = (spec, fromFile) => {
    const p = join(dirname(fromFile), spec);
    if (existsSync(p) && !p.endsWith("/")) return true;
    for (const e of exts) if (existsSync(p + e)) return true;
    for (const e of exts) if (existsSync(join(p, "index" + e))) return true;
    return false;
  };
  if (existsSync(dir)) {
    for (const f of walk(dir, /\.(ts|mjs)$/)) {
      // Strip comments + template literals first - codegen strings
      // inside them are not real imports of THIS file.
      const src = readFileSync(f, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "")
        .replace(/`(?:[^`\\]|\\[\s\S])*`/g, "``");
      for (const m of src.matchAll(/(?:from|import)\s+['"](\.[^'"]+)['"]/g)) {
        if (!resolves(m[1], f))
          hit("orphaned-tool-imports", rel(f), `import '${m[1]}' does not resolve`);
      }
    }
  }
}

// ---------- report ----------
const failures = [];
const byCls = new Map();
for (const h of hits) {
  if (!byCls.has(h.cls)) byCls.set(h.cls, []);
  byCls.get(h.cls).push(h);
}
for (const [cls, list] of [...byCls.entries()].sort()) {
  console.log(`FAIL  ea:${cls}  (${list.length})`);
  for (const h of list.slice(0, 15)) console.log(`      ${h.loc} :: ${h.msg}`);
  if (list.length > 15) console.log(`      ... +${list.length - 15} more`);
  failures.push(cls);
}
if (!failures.length) console.log("All EA defect-class checks passed");
else console.log(`\n${failures.length} defect-class check(s) FAILED`);
process.exit(failures.length ? 1 : 0);
