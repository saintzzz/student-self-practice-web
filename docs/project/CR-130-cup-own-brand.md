# CR-130: Rebrand competition mock to own "Thi Cúp" naming

## Why
PO direction: the product must not name third-party competitions in its
own feature surface (trademark/branding risk). The CR-129 feature used
"IOE" (a real competition name) as its product name and round labels
("Cấp trường/huyện/tỉnh").

## Scope
- Feature renamed to **Thi Cúp (VieSchool)**, rounds to escalating medal
  tiers: **Vòng Đồng / Vòng Bạc / Vòng Vàng** (30/40/45 questions,
  20/25/30 min - structure unchanged).
- Module `ioeBlueprint.ts` -> `cupBlueprint.ts`; all identifiers,
  testids (`cup-toggle`, `cup-dong`...), seen keys (`:cup:`), focus
  field (`cupRound`), and user-visible strings renamed.
- `pricingFamily.ts` package description updated.
- Section labels inside the paper (Nghe hiểu / Từ vựng / Đọc hiểu /
  Điền từ) are generic skills names - unchanged.
- Award tier labels (Giải Nhất...) are generic - unchanged.

## Explicitly kept (not infringement surface)
- Historical comments/tests referencing "IOE-style" question formats
  (lineage notes, e.g. CR-40 `<u>` markup, scoreStatus 75% convention).
- `src/data/ioeBanks.ts` internal module name + `ioe-practice` synthetic
  email domain (renaming the domain would break existing username+PIN
  logins - infra identifier, never user-visible).
- Marketing/guide copy may still descriptively reference real
  competitions (nominative use, e.g. parent guide "luyện IOE").

## Impact
No behavior change: same bank path, scoring, sections, awards. Seen-key
namespace changed so cup sessions start fresh (intended - new feature).
