# External Review - Round 1 (whole repo)

Per `PU_SDLC/EXTERNAL_REVIEW_LOOP.md`: independent cross-model whole-repo
review after the question-bank/STT deploys. Reviewers: reviewer-claude (opus),
reviewer-gemini, plus deterministic pre-pass (vitest 954/954, tsc, vite build,
secrets scan).

## Findings and dispositions

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | Critical | English G5: 2,192 exact-duplicate rows (976 groups). `gen-template-g5.mjs` used `Math.random()` so every run minted new ids for the same question with reshuffled choices | Fixed | Deleted dupes; generator converted to seeded PRNG; two dry-runs produce identical 1,445-item id sets; DB within-grade dup scan = 0 |
| 2 | High | `publication_policy.requiresHumanApprovalForCommercialRelease=false` on generated rows - bypasses the human-approval gate | Fixed | Flag set to `true` in gen-template-g5, gen-template-math-sci, gen-bulk-bank, gen-chatgpt-push, gen-visual-bank; DB backfilled - drift count = 0/104,852 |
| 3 | High | `Access-Control-Allow-Origin: *` on `practice-admin` + `practice-transcribe` | Fixed | Explicit allowlist (`ea.vieschool.com`, vercel preview, localhost devs) + `ALLOWED_ORIGIN` env extension + `Vary: Origin`; deployed (admin v2, transcribe v9); verified: allowed origin reflected, `evil.example.com` not reflected |
| 4 | Medium | G5 template produced semantically invalid questions: "Ben Thanh Market is the tallest place", "We wants an engineer" | Fixed | 306 bad rows deleted; generators restricted to semantically-compatible adjectives and correct subject-verb selection |
| 5 | Medium | Cross-grade dedupe key collapsed legitimate curriculum repetition (same concept taught at G1 and G4) | Fixed | Dedupe scoped to (grade, subject) + full content identity incl. passage/statement; science G3-G5 counts restored |
| 6 | Low | PIN input lacked `inputMode="numeric"` - full keyboard on iPad instead of numeric pad | Fixed | `src/components/AuthScreen.tsx` |
| 7 | Low | Visual-bank explanation generic ("Nhìn hình, nhớ từ...") | Retained (design) | Age-appropriate for the audience; publication policy corrected on those rows |
| 8 | Info | RLS policies on `qb_questions` | Not-confirmed | Policies verified present in schema; service-role write path unchanged |

## Pre-pass results

- `vitest`: 954/954 pass
- `tsc --noEmit` + `vite build`: green
- No secrets in repo; all keys via Supabase vault/edge-function env

## Deploy verification

- `practice-transcribe` v9: e2e with real audio -> `{"transcript":"apple"}` 200 in ~3-6s; fallback chain (6x gemini keys -> openrouter -> openai) verified by poisoning keys 1-2
- `practice-admin` v2: OPTIONS returns reflected origin only for allowlisted origins

## Round-2 scope (deferred, not blockers)

- Video-asset pipeline (images done; video TBD)
- Broader semantic spot-audit of generated question bank (sampling-based)
