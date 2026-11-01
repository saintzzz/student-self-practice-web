# External Review r20 - CR-114 Class Show

Reviewer: pinned cross-model reviewer-gpt (documented fallback), round r20.
Target: commit 91628cc (r19 fixes + steal mechanic).
Verdict: **ROUND CLEAN** - APPROVE_WITH_CHANGES, zero Critical/High.

## Findings

### Medium

1. **[FE] `spin` preflight used `exclude.size`, could over-skip on a stale index.** **FIXED:** eligibility now computed by filtering roster indices exactly like `pickStudent`; `verdict(false)` guards `picked` bounds before adding to `missed`.

2. **[FE] `advance()` did not clear a live spotlight interval** - ArrowDown skip or all-missed path could let the interval resurrect the question phase. **FIXED:** `advance()` clears and nulls `spotTimer.current` first; `spin()` also nulls after clearing.

### Low

3. **[FE] Pad comment claimed no id clashes but code did not enforce it.** **FIXED:** pad filters sample ids already present in the show.

4. **[FE] `inert` on a `display: contents` wrapper is cross-browser fragile.** **FIXED:** real wrapper div (`space-y-6`, no `contents`) + `opacity-60` while loading.

### Nit

5. **[FE] `.focus()` without preventScroll can jump the projector view.** **FIXED:** `focus({ preventScroll: true })` with a plain-focus fallback.

## r19 verification

All r19 fixes confirmed in 91628cc: exact-`count` fetch, `initialGradeId` wiring, optionImages passthrough + rendering, setup Space/Enter with interactive-target skip, aria-live/status/alert + phase focus, spin timer clear, inert loading, stable podium ties. Vietnamese copy clean of em/en dashes; at most one `CTA_GOLD_XL` per screen state.

## Triage

- Fixed: 1, 2, 3, 4, 5 (all actionable findings closed in the follow-up commit on top of 91628cc).
- Loop status: **clean round achieved** - CR-114 external review loop complete (2 rounds).
