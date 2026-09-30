# CR-21: Regulatory research 2026 + production QA verification

**Date:** 2026-09-30
**Type:** Research + verification (no schema/code change beyond docs)
**Status:** Implemented, verified on production

## Regulatory research summary

Findings from the 2024-2026 MOET circular/decision sweep relevant to English Arena:

1. **Thông tư 15/2026/TT-BGDĐT** (Điều lệ trường, effective 10/05/2026)
   - School educational organization explicitly includes digital competency, AI awareness, STEM/STEAM, life skills, and English-strengthening activities. A digital English self-practice product is squarely inside the sanctioned category.
   - Student assessment must be confidential and must not compare one student against another. English Arena is self-practice with personal progress (stars/streaks), not ranked comparisons - compliant. Class scoping must keep student data visible only to their own admin/teacher.
2. **Dự thảo Thông tư sửa đổi TT 27/2020 + TT 22/2021** (Công văn 4582/BGDĐT-GDPT, 07/2026)
   - Computer-based periodic testing and digital school records are being formalized. Online self-practice and digital result records align with this direction.
   - Caveat: this is still a draft - features are positioned, but final text may change. No hard dependency should be built on draft clauses.
3. **CTGDPT 2018 / Global Success alignment**
   - Vocabulary and activity topics continue to follow the Global Success grade 1-5 program. Do not cite TT 17/2025 as an English-specific amendment - it is not.
4. **Competitor sweep** (Monkey Junior, Babilala, Duolingo ABC, Lingokids, Khan Academy Kids, IXL, VietJack)
   - Common gaps vs English Arena already shipped: picture-based prompts, phonics, listening with prerecorded neural audio, world progression, streaks, class-scoped accounts.
   - Remaining differentiators to backlog: offline mode, parent progress reports, printable certificates, placement diagnostic.

## Production verification results (ea.vieschool.com)

| Check | Result |
|---|---|
| Student PIN login (`demo_hs`) | OK - journey map renders all 5 grades |
| Journey map | 5 regions: Sân chơi, Thị trấn, Rừng rậm, Thành phố, Vũ trụ |
| Admin login + console | OK - accounts, classes, assignment, content tabs all render |
| Admin account management | Tạo tài khoản / Đổi PIN / Xóa / Gán học sinh visible and functional |
| Page errors | none |
| Guest practice mode | kept separate from authenticated student mode |
| Unit tests | **720/720 pass** (85 files, vitest) |
| Build | `tsc -b && vite build` green, 8.1s |

CR-08 (authenticated accounts on production) is now fully resolved: both student and admin logins verified live, account/class management working, no page errors. Remaining CR-08 tail item is only env-var documentation hygiene, not functionality.

## Regulatory posture decisions

- Keep TT 15/2026 wording when describing school-family coordination; do not cite repealed TT 32/2020 / TT 28/2020.
- Keep the no-student-comparison principle: any future leaderboard must be class-level emulation or personal-progress only, never individual ranking exposed to other students.
- Class scoping stays hard: RLS + Edge Function authorization must deny cross-class reads; re-verified in this run.

## Backlog proposed from competitor gap analysis

1. Parent progress report view (weekly digest, per-child).
2. Placement diagnostic to assign starting grade automatically.
3. Printable certificates at world completion.
4. Offline/practice-pack mode for low-connectivity schools.
