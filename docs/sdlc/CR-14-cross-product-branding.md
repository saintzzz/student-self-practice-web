# CR-14 — Đồng bộ branding VieSchool + demo accounts theo role + cập nhật claims

**Status:** approved (user directive) | **Scope:** cross-product (landing + English Arena + TVC360 + Sổ Chủ Nhiệm Số)

## What changes

1. **Brand sync**: all education apps carry the VieSchool umbrella identity
   (title suffix `- VieSchool`, "Sản phẩm của VieSchool" + back-link to
   vieschool.com on every login/auth surface). Product identities stay:
   English Arena keeps Bé Heo, TVC360 keeps teacher-tool identity,
   Sổ CN keeps homeroom-book identity.
2. **Demo accounts per role** - professional matrix documented in
   `docs/demo-accounts.md`.
3. **Landing copy**: Vietnamese diacritics everywhere; ecosystem scope
   Grades 1-12; English Arena = cấp 1 now, roadmap full 1-12.
4. **Standards citations updated** (researched 2026-03):
   - Curriculum: CTGDPT 2018, amended by Thông tư 17/2025 (eff. 12/9/2025) -
     latest amendment touches History/Geography/Civics, not English.
   - School regulation for Sổ CN: Thông tư 15/2026/TT-BGDĐT (eff. 10/5/2026)
     replaces TT 32/2020 + TT 28/2020.
   - Marketing claim (corrected 2026-09-30): TT 17/2025 only amends
     History/Geography/Civics - never cite it next to English/Global
     Success. Correct copy: English Arena = "bam SGK Tieng Anh Global
     Success theo CTGDPT 2018"; TVC360 = "CTGDPT 2018 (gom sua doi cua
     TT 17/2025 cho Lich su, Dia li, GDCD)"; So CN = "Dieu le truong
     (TT 15/2026)" stays accurate.
5. **Vocabulary claim**: `524+ từ vựng bám SGK` - bank verified at exactly
   524 unique words (`ALL_WORDS.length = 524`, unique = 524). "524+" holds
   literally; expansion to 600+/700+ is a separate content CR.
6. **"1 nền tảng - 3 sản phẩm - 1 tài khoản" audit** - see below.

## Impact assessment

| Area | Impact | Risk |
|---|---|---|
| Landing page | copy only | none |
| tvc360 login + metadata | 1 link + title suffix | none - verify login flow unchanged |
| so-chu-nhiem login + metadata | 1 link + title/description | none - verify login flow unchanged |
| EA auth backend | 2 new demo accounts + 1 demo class + enrollment + 5 grade scopes | low - additive rows only |
| Sales deck | regenerate with new claims | none |

## "1 NỀN TẢNG - 3 SẢN PHẨM - 1 TÀI KHOẢN" - honest audit

| Claim | Status | Evidence |
|---|---|---|
| 1 nền tảng | ĐẠT (brand/domain level) | one umbrella domain, one Supabase project `cxjpgfhqchjoernfmcra`, shared DNS |
| 3 sản phẩm | ĐẠT | ea / congcuso / sochunhiem subdomains live |
| 1 tài khoản | **CHƯA ĐẠT** | EA uses `practice.accounts` (username+PIN, synthetic emails `@students.ioe-practice.example`); TVC360 uses `auth.users` with `app='tvc360'` metadata + `tvc_*` tables; Sổ CN uses `profiles` + `@demo.scn`. Three separate identity stores - no SSO, no shared session. |

Landing kicker changed to `1 NỀN TẢNG - 3 SẢN PHẨM - HỖ TRỢ LỚP 1-12`
(truthful). True SSO is roadmap: unify on `auth.users` with per-app role
claims + cross-subdomain session handoff - tracked as future CR.

## Rulings

- R1: Umbrella wording uses "hệ sinh thái số cho trường học Việt Nam" (not
  "tiểu học") since ecosystem target is 1-12.
- R2: "1 tài khoản" removed from landing kicker until SSO ships - honest
  marketing over aspirational claims.
- R3: Demo PIN convention `demo2026` for EA; TVC360/SCN keep `demo1234`
  convention (pre-existing, documented).

## Wave 2 - shared brand signature (2026-10-01)

Audit showed reskin was done but the cross-app signature was incomplete
(VieSchool mark only on some login screens, 3 different typefaces).
Unified signature now applied to every app:

- **Shared typeface:** Be Vietnam Pro across landing + TVC360 + Sổ CN +
  EA body text (self-hosted woff2 in EA, next/font in the two Next apps).
  EA keeps Baloo 2 for display headings - kid voice. Fixed latent bug:
  SCN loaded Figtree without the `vietnamese` subset, so diacritics fell
  back to system font.
- **Signature element:** "sản phẩm của VieSchool" link to vieschool.com
  present on every product surface - EA map footer, TVC360 hero +
  teacher sidebar + moderation header, SCN sidebar (desktop + mobile
  drawer) + login. Login pages already carried it.
- Verified on prod: getComputedStyle font = Be Vietnam Pro on all 3
  domains; SCN gvcn@demo.scn login -> dashboard renders with signature;
  0 console errors.

Commits: EA `32bb33d`, TVC360 `25acddf`, SCN `d339b24`,
landing redeploy `dpl_AfHyqqYyMN3LUteB9ZioWALSnuMV`.
