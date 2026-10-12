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
