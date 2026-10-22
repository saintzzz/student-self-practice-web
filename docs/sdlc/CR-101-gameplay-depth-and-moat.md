# CR-101 - Gameplay depth (50:50 hint) + anti-scrape moat (bank rate limiting)

## Driver

PO directive: deepen gameplay, raise question/TTS quality, and harden the
system against cloning ("không thể bị clone"). Code reality check first:

- TTS is already strong (CR-19/77/82: neural mp3s + ranked voice fallback +
  kid-paced rates + mic-suppression). Question quality is the gen/polish/
  verify pipeline's job on the content side - no frontend gap.
- The REAL moat is the curated 29k-question bank in Supabase. Audit found:
  RLS on every table + admin-only SELECT on `qb_questions` (no raw dump)
  BUT `fetch_questions_public` was anon-callable, `p_count` up to 200,
  unlimited call frequency - a trivial loop could drain bank + answers.
- QuizShow already proved the bail-out pattern (one 50:50 lifeline/run);
  every other choice-game lacked it.

## Scope shipped

| Item | What shipped |
|---|---|
| **Anti-scrape rate limiting** | Migration `0044`: `check_rate_limit_weighted` (row-weighted window counter) + wrapper pattern - originals renamed `*__impl`, direct EXECUTE revoked so PostgREST cannot route around the wrappers. `fetch_questions_public`: global guest budget 300 calls + 8,000 rows/hour. `fetch_questions`: per-uid 60 calls + 4,000 rows/hour; `service_role` bypasses. Breach raises `PT429 rate_limited`; `rate_limits` rows double as an alarm signal. `bank.ts` maps it to a kid-readable retry message |
| **50:50 hint everywhere** | `pickFiftyFifty()` + `HintButton` in `mechanics.tsx` (same style as QuizShow's lifeline). Adopted in 11 games: BalloonPop, FishingCatch, FeedThePig, WhackMole, GoldQuest, PictureReveal, TreasureChest, RacingCars, CastleGuard, TicTacToe, MazeChase (removes one wrong pad). Hidden indexes live in a SEPARATE `hints` state - never merged into `wrongPicks` for scoring, so a hint costs no heart, no point, no missLimit slot. Once per run. QuizShow keeps its own themed lifeline - 12/15 games now have a bail-out |

## Deferred (documented, not shipped)

- **Server-side scoring** - the deeper moat: answers ride the RPC payload
  today because scoring is client-side. Moving verdict/score to an RPC
  strips `answer`/`explanation` from the wire entirely = bank unscrapable
  in usable form. Big architectural CR (touch every exam/session path).
- **Turnstile / signed practice sessions** - Edge-Function-issued token
  gating `fetch_questions_public`; the honest per-client identity the
  global bucket approximates. Needs an Edge Function + rollout plan.
- **`src/data/vocabulary` lazy-split** (501K in the index chunk) -
  per-grade dynamic import; a refactor with its own regression surface.
- LetterCatch/WordWorm/MemoryMatch hint - their fields have no 4-option
  picks; a distractor-removal variant is possible but marginal.
- World-map hub (M1) - still art-gated on the artgen pipeline.

## Acceptance

- Migration applied + verified: anon fetch returns rows, counters
  increment (`fq_pub_calls`/`fq_pub_rows`), `__impl` functions deny anon.
- `pickFiftyFifty` + hint adoption unit-tested
  (`mechanics.hint.test.tsx`).
- tsc + build + game tests green; Playwright on a real flow.
- Vietnamese copy: hyphen `-` only; zero new dependencies.
