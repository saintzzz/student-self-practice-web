# Competitive research - Cú Pi Math (cupimath.com)

Date: 2026-11-06. Source: public landing + feature copy at cupimath.com.

Closest structural analog to EA found so far: same product shape
(per-grade curriculum, practice by type, mock exams, mascot engagement,
parent reporting) applied to math instead of English. Gaps below are
highest-value borrowable patterns.

## Their model

- 734 "dạng toán" (question types) across mầm non -> lớp 9, each taught
  via a video lesson + worked-example card, then practiced until solid.
- Mock exams replicate 19 real competitions (TIMO, HKIMO, FMO, Kangaroo,
  SASMO...) - exact question count, time, section weights, negative
  marking, bonus questions, and award thresholds per competition and
  per round (loại / quốc gia / quốc tế).
- "Sổ câu sai" - wrong questions auto-collected, review scheduled with
  widening intervals, 5 questions per review round, due count surfaces
  on the grade page as an "Ôn câu sai" button.
- Bilingual VI-EN questions; on English-language exam papers, key terms
  get inline VN glosses ("sum (tổng)").
- Engagement: nameable mascot, feed-the-pet after study, nest decoration
  shop (star sink), sticker collection for mastering types / awards,
  seasonal events (Halloween skins), lucky wheel on daily tasks.
- Social: same-grade leaderboard (auto-promoted Sep 1), award cups,
  pet visits + seed gifting, emotes-only (no chat), parent opt-out
  toggle for leaderboard visibility.
- Arena: real-time 1v1, correct-first answer attacks, HP/element types,
  vs-bot tiers; unlocks only after studying today ("học trước, chơi
  sau"); parent sets match count / days / hours.
- Parent surface: weekly AI-style "Nhận xét" (praise first, weak types
  with deep-link to the lesson), 7/30-day stats vs last period,
  wrong-book due count, multi-kid profiles under one account, parent
  PIN gate, in-app account deletion, "báo lỗi câu này" one-tap report.
- Legal/commercial: HKD entity footer (MST, address, phone, email),
  7 policy pages (ToS, privacy, pricing, payment, service terms,
  termination/refund, complaints), delete-account guide page,
  explicit "not affiliated with organizers; self-authored exams".
- SEO: per-competition landing pages (/thi-timo, /thi-ikmc...), exam
  calendar with dates + sample papers, /de-thi/ answer-key library,
  "tra cứu điểm" lookup page.

## Map to EA infra (what we already have)

| Cupimath | EA equivalent | Gap |
|---|---|---|
| Lộ trình dạng toán per grade | grade curriculum + skill taxonomy | have |
| 35k questions w/ solutions | 99k+ question bank w/ explanations | have |
| Sổ câu sai + hẹn ôn | SRS review queue (qb_item_stats, ReviewQueueCard) | have |
| Nhận xét phụ huynh | coach.ts weak-skill + ParentReportScreen | partial |
| Đấu trường 1v1 | ArenaLive VS | have (safety TBD) |
| Sticker/pet/shop | stars, rewards, streaks | partial sink |
| **Exam-structure mocks (19 contests)** | generic "Thi thử 120c/25p" | **GAP** |
| **Worked-example card + video per type** | none - practice-only | **GAP** |
| **Báo lỗi câu này** | none | **GAP** |
| VN gloss on EN keywords | none (we teach English; reverse applies) | gap |
| Multi-kid profiles + parent PIN | single student + guest | gap |
| Exam calendar + de-thi SEO pages | vieschool-content guides only | gap |
| Tra cứu điểm | none | gap |
| Delete-account page + 7 policies | 3 policy pages, no self-serve delete | gap |
| Seasonal mascot events | none | gap |

## Proposed harvest order (PO call)

1. **IOE/YLE exam-structure mock** (CR). English equivalents: IOE cấp
   trường/huyện/tỉnh/quốc gia, Cambridge YLE Starters-Movers-Flyers,
   KET/PET. Same scoring-fidelity trick: per-competition section
   weights, timing, question mix. Repo is literally named `ioe-*`.
   Includes the "not affiliated, self-authored" disclaimer pattern.
2. **Worked-example card per skill** (cheap version of their video):
   before a new skill's practice round, show a 1-screen "thẻ ví dụ"
   (model answer + why). No video needed for v1.
3. **"Báo lỗi câu này"** one-tap report on the explanation panel -
   content-QA flywheel for a 99k bank; trivial: insert into a
   qb_reports table, surface in admin.
4. **Parent weekly "Nhận xét"** reusing coach.ts: praise-first summary
   + weak skills + deep-link practice CTA + wrong-book due count.
   Parent trust = retention = referral.
5. **Exam calendar + /de-thi-ioe/ SEO pages** on vieschool-content:
   IOE rounds + YLE/KET dates with sample-paper links into EA guest
   flow. Acquisition hook.
6. **Multi-kid profiles + parent PIN gate** for family conversion
   ("một tài khoản cả nhà").
7. **Legal parity**: granular policy pages (pricing, payment, refund,
   complaints) + in-app "Xoá tài khoản" + HKD-style entity footer
   once entity details exist.
8. **Seasonal events** (Tết/Halloween skin + limited stickers) -
   cheap recurring engagement.
9. **Safety audit of ArenaLive** vs their posture: emotes-only,
   parent-set match/day/hour limits, leaderboard opt-out, same-grade
   matching - port whichever gaps exist.
