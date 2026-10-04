# CR-53 - Image Asset Legal Review and Remediation

**Status:** Implemented
**Requester:** PO (user)
**Date:** 2026-10-11

## Request

> "xem lai phan nguon hinh anh xem co legal khong. can thay doi gi thi lam nhe."

Review every image/media source shipped or referenced by the app for legal
redistribution rights; remediate whatever is needed.

## Classification

CR (compliance/remediation) - removes shipped content and changes the
public attribution contract.

## Inventory and legal findings

| Asset | Files | Provenance | Verdict |
|---|---|---|---|
| `public/emoji/svg/` | Twemoji set | CC-BY-4.0, attributed | KEEP |
| `public/emoji/lottie/` | Noto Animated Emoji | CC-BY-4.0, attributed | KEEP |
| `public/fonts/baloo-2/` | Ek Type via Google Fonts | OFL-1.1 | KEEP + add OFL.txt (OFL requires the license text to ship with the font) |
| `public/fonts/bevietnam-pro/` | Be Vietnam Pro via Google Fonts | OFL-1.1 | KEEP + add OFL.txt + was MISSING from attribution.json |
| `public/images/concepts/` (1,190) | Noto Color Emoji glyph renders + original card composition | Source font Apache-2.0; renders are new files we generated | KEEP + attribute; fix license claim (DB metadata wrongly said SIL OFL-1.1 - Noto Color Emoji is Apache-2.0) |
| `public/images/counting/` (100) | same | same | same |
| `public/images/v3/` (45) | same | same | same |
| `public/images/v6/` (120) | Original rendered diagrams | VieSchool-owned | KEEP + attribute as original |
| `public/sfx/` (2) | Self-synthesized (`scripts/gen-sfx.py`) | VieSchool-owned | KEEP + attribute as original |
| `public/images/vio/` (1,291, ~11MB) | Harvested from violympic.vn practice rounds via an account session | **No redistribution license. "reference-only" is not a license.** | **DELETE** |
| `src/data/vioMathBank.ts` (3,890 lines) | Harvested Violympic items referencing `/images/vio/` | Dead code (no imports), still shipped in repo | **DELETE** |
| `src/data/ioeRealBank.ts` (971 lines, ~120KB) | Harvested IOE items; gated off (`ioeBankForGrade` -> undefined) since CR-48 but still bundled | Same class of risk; header itself says "Review licensing before shipping verbatim" | **DELETE** |
| `src/data/ioeBanks.ts`, `reorderBank.ts`, `grammarBank.ts`, `readingBank.ts` | Authored in-house (CR-24/26) | Owned | KEEP |

## Decisions

1. Remove all harvested third-party material from the repository: the
   `/images/vio/` set, `vioMathBank.ts`, `ioeRealBank.ts`. A source URL
   plus a "reference-only" label is not evidence of redistribution
   permission, and the product is commercial/public.
2. Remove the now-dead `generateIoeReal*` generator family and its pool
   slices in `buildEnglishPool`; the `real` quota object goes with it.
   `reorderBankForGrade` stops merging harvested sentences.
3. `attribution.json` must describe the actual shipped inventory:
   remove the `violympic-math-english` record; add `bevietnam-pro`,
   `noto-symbol-renders` (Apache-2.0, covers concepts/counting/v3),
   `vieschool-original-assets` (v6 diagrams + sfx, all rights reserved).
4. Ship `OFL.txt` inside both font directories (OFL 1.1 condition).
5. `check-attribution.mjs` becomes the enforcement gate: every
   `public/images/<dir>` must be covered by a declared collection path,
   `/images/vio/` is a forbidden prefix, font dirs must carry a license
   file, collection paths must exist on disk.
6. Correct the DB provenance metadata (`fontLicense`) from SIL OFL-1.1
   to Apache-2.0 for Noto-derived rendered assets.
7. The "harvested content retired" invariant tests are rewritten to
   assert the files no longer exist - stronger than asserting the
   generators return empty.

## Impact

- Bundle shrinks ~120KB (ioeRealBank data) + ~11MB of public assets no
  longer deployed.
- No runtime behaviour change: the canonical bank serves from Supabase;
  bundled pools already received `[]` from the gated bank.
- Historical docs (CR-33/35/48, ioe ANALYSIS.md) remain as the honest
  record that the material was harvested and is now removed.
