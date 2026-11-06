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

## Extension - marketing surface sweep (2026-11-06)

User flagged residual "luyện thi IOE" on ea.vieschool.com/guides. Full
cross-repo sweep found the feature rebrand (above) had left the whole
content/marketing layer untouched - scope miss on the original CR.

Fixed:
- vieschool-content 06bf5e4: new own-brand guide
  `luyen-thi-tieng-anh-truc-tuyen-tieu-hoc`; old IOE guide file converted
  to meta-refresh redirect stub; copy/meta/links updated on home, /mua,
  guides index, phonics + SGK guides, llms.txt, sitemap.xml, /thi-cup.
- vieschool-landing e095ec4: index.html + llms.txt copy (worker bumped to
  e095ec4 - landing serves via jsDelivr pin, not Vercel).
- app b780122: AuthScreen footer "luyện IOE" -> "luyện thi".
- scanning-marketing 89c7034: GSC inspect list follows new guide URL.

Verified on prod (Playwright): /guides, new+old guide URLs (redirect),
home, /mua, /thi-cup, /llms.txt, vieschool.com + /llms.txt, /app
AuthScreen - zero "IOE" in rendered output.

Deliberate retentions (internal only, never rendered):
- `students.ioe-practice.example` auth email domain (breaking change for
  existing accounts), also mirrored in provision-demo.mjs.
- `ioeBanks`/`ioeRealBank` data identifiers, "IOE-style" format comments,
  test descriptions, historical docs/research/CRs, SEO report archives.
