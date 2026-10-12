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
//  15. migration-grants            - anon usage / item_stats grants absent (r4 M)
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
    if (!/grant select on\s+(?:table\s+)?practice\.qb_item_stats\s+to authenticated/i.test(mig))
      hit("migration-grants", "supabase/migrations", "authenticated missing qb_item_stats select");
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
