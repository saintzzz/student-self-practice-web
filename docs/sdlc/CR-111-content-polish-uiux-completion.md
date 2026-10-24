# CR-111: Content polish + UIUX/image completion audit

## Intake classification: CR (content quality requirement change)

PO decision (user, 2026-10-24): remaining tracked P1/P2 findings are not
acceptable for PRD. "Chất lượng kém thì phải tìm cách fix" - explanations
must read like a teacher wrote them, not a stripped template.

## Scope

### 1. explanation_vi polish (654 rows)

Rows whose `explanation_vi` contains zero Vietnamese diacritic characters
are template-generated undiacritized Vietnamese with machine-translation
artifacts ("make lam chia thanh made"). Requirements:

- Restore correct Vietnamese orthography (full diacritics).
- Fix grammar so the sentence reads naturally to a Grade 1-5 student.
- Preserve English words being explained exactly (answer terms, quoted
  option text) - never translate the tested vocabulary.
- Keep factual content identical - no new claims, no removed claims.
- Method: LLM polish via codex CLI batches (browser/CLI automation rule -
  no API keys for bulk content). Validation per row: same id, length in
  sane bounds, contains diacritics OR is pure-English-quote content.

### 2. P1/P2 triage

- `ambiguous-open-prompt` (24): review each; rewrite or quarantine.
- `form-blueprint-missing` (22): mint minimal blueprint rows matching
  form size OR clear the dangling `blueprint_id` (decide by schema use).
- `explanation-mentions-other-answer` (10): manual pass, confirm
  pedagogical or fix.
- `ambiguous-country-name` (2): disambiguate in prompt if needed.

### 3. UIUX + image completion audit

- Playwright pass over prod: login, map, grade select, round, results,
  guest path - check imagery, empty states, contrast, kid-target floor.
- Verify visual question types render their `qb_question_assets` images.
- Fix any gap found (missing image, unstyled state, layout break).

## Impact

- DB: 654 `explanation_vi` updates + small prompt/blueprint edits.
- Frontend: only if the UIUX audit finds real gaps.
- Migration file for data changes; audit re-run must show P0=0 and the
  P1 explanation count drop to ~0 (rows legitimately all-English exempt).

## Verification

- `qb-content-audit.mjs` re-run: explanation-not-vietnamese -> near 0.
- Spot-check 20 polished explanations by reading them.
- Playwright prod smoke with screenshots.
- External review round until CLEAN.
