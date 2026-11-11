# CR-135: Semantic correctness of the math-vi question bank

## Problem

User-reported: "Phúc hái được 33 nhãn vở" — the generator pairs verbs and
nouns without collocation rules. Audit of `scripts/gen-template-mathvi.mjs`
found a systematic class of defects, not a one-off:

1. **`hái` + every item** — pick/harvest only works for fruit & flowers,
   not vở/bút/sách/nhãn vở/bi/kẹo (44 live rows).
2. **Missing classifiers** — "có 5 vở", "xếp 20 bi" instead of "5 quyển
   vở", "20 hòn bi" (~194 live rows). Broken Vietnamese for a learning app.
3. **"Đồng hồ chỉ phút chỉ"** — malformed clock prompt (G3).
4. **"mỗi chỗ"** — wrong referent for container word problems (24 rows).
5. **Wrong containers** — "xếp sách vào lọ", "xếp vở vào rổ".
6. **"giờ rưỡi là giờ bao nhiêu phút"** — ungrammatical, needs "tức là".
7. **Non-digit distractors** on "là chữ số nào" questions ("13" is not a digit).

## Why it matters

An education app serving semantically wrong Vietnamese teaches children
wrong language. This is a school-sales blocker: any teacher demoing sees
it immediately.

## Remediation

- `ITEMS` now always renders full classifier form in prompts; `short` is
  only used as an asset/emoji key.
- New `HARVEST_ITEMS` subset (cam, táo, xoài, ổi, mận, hoa) — the only
  nouns `hái` may take.
- New `CONTAINERS` map: plausible containers per item (sách→kệ/hộp/túi,
  never lọ; kẹo→túi/hộp/lọ, never rổ).
- Fixed malformed phrasings: "Lúc X giờ đúng/rưỡi, kim phút chỉ…",
  "Hỏi mỗi {place}…", "giờ rưỡi tức là".
- "Bạn {name}… Mẹ cho {name} thêm…" — clearer pronoun use.
- **Semantic guard**: generator now self-fails on known-bad patterns
  (hái+non-harvest, bare countable nouns, "mỗi chỗ", malformed clock,
  non-digit distractors) — regressions cannot be upserted silently.
- `publish-mathvi-assets.mjs` regexes updated to match classifier forms;
  EMOJI map extended for new fruit.

## Data cleanup

- Regenerate all grades (deterministic upsert, new ids for changed prompts).
- Quarantine previously-published bad rows: set
  `publication_policy.practiceEligible/mockEligible/examEligible = false`
  on prompts matching the bad patterns (they keep existing for attempt
  history integrity but stop serving).
- Republish visual assets; stale links removed first.

## Acceptance

- `DUMP` dry-run of all grades shows zero bad-pattern prompts.
- DB: zero serving (`canonical`/eligible) rows matching bad patterns.
- Semantic guard fails generation if a bad pattern is reintroduced.
- Practice/Thi thử flows verified on prod.
