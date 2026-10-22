# CR-105 - Bundle budget remainder (legacy absolute caps)

Recorded debt converted to a tracked CR. NOT urgent - the operative
delta gate is green; this closes the last absolute-cap overage so the
gate is honest without an inherited-debt exemption.

## Measured state (2026-10-22, fresh build)

| Metric | Current | Delta gate (cr82 baseline + cap) | Legacy absolute |
|---|---|---|---|
| Entry JS gzip | 129.83 kB | 129.27 +10 -> **OK (+0.56)** | 121 -> over by ~8.8 kB |
| Entry CSS gzip | 19.65 kB | 19.6 +3 -> **OK (+0.05)** | 10 -> over by ~9.6 kB |

(Caution: `check-bundle-budget.mjs` reads `dist/` - always rebuild
before judging; a stale dist showed 189 kB and produced a false alarm.)

## What is already done

- CR-82: delta gate introduced precisely because the absolute caps were
  unmeetable then (A-28 advisory, documented inherited debt).
- CR-103: `vocabulary`/`ipaMap`/`commonEnglishWords` lazy-split via
  `lib/content/contentBank.ts` - index eager 623 -> ~438 kB raw.
- CR-82 M9: `ExamScreen` lazy via `ExamRouteBoundary`; tracing +
  flashcard chunks bounded at 12 kB caps; entry is lottie-runtime-free.

## Remaining gap analysis

~9 kB JS + ~10 kB CSS over absolute. Realistic closes, cheapest first:

1. **Re-anchor the absolute caps** to current reality (129.83/19.65 ->
   e.g. 135/22 with the delta gate kept on top). Honest accounting: the
   absolute numbers were set pre-CR-99/100 gamification waves; the
   platform legitimately grew features (Game Zone, live arena, hub).
   Zero code risk; the delta gate still prevents drift.
2. **Shave real bytes** only if a measured rock exists:
   - `EmojiLottiePlayer` (171 kB raw) already lazy - not in entry.
   - `vendor`/`supabase` chunks already split and long-cacheable.
   - Next candidate would be auditing the eager data still reachable
     from `GRADES`/`contentBank` index (topic meta, deck defs) - needs
     a sourcemap attribution run first; expected yield < the re-anchor.
3. CSS: 19.65 absolute vs 10 cap - the v5 design system grew token
   surfaces; a per-route CSS split is disproportionate work for ~10 kB
   gzip. Re-anchor is the sane close.

## Recommendation

Option 1 (re-anchor) in this CR; revisit byte-shaving only when the
delta gate trends toward its +10 cap again.

## Out of scope

- EmojiLottiePlayer chunk size (lazy, capped at 12-kB-warn elsewhere
  but currently 34.9 kB gzip - acceptable as an async chunk; flag if
  it ever reaches the entry).
- Supabase chunk (59 kB gzip, lazy after auth config check).
