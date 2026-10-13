# Research: Parent Conversion + Funnels (Phase 0.5 input)

Source: independent research subagent report.

## Premise correction

Parent surfaces partially EXIST (thin):
- `ParentReportScreen.tsx` - read-only dashboard (7-day bars, streak, stars,
  badges, skill accuracy, due-review). LOCAL storage only - warns "chưa đồng
  bộ giữa các máy". Guest-safe.
- `parentContact.ts` + verify RPCs (`request_parent_verify`,
  `confirm_parent_email`) - parent email capture + Sunday weekly digest
  server-side, logged-in students only.
- Entry = small pill in GradeSelect - NO parent gate; a kid can open it.
- Guest trial exists ("mỗi lớp 1 vòng miễn phí"); JoinClassCard = class
  distribution channel.

NOT existing: public landing, parent gate, pricing/checkout, shareable
achievement, certificates, parent-owned remote view, cross-device sync for
guests. Highest-leverage gap: report exists but is invisible to parents,
ungated, local-only, never reaches parent hands.

## Purchase psychology (universal)

- Parents buy parent-centered needs: "my child is learning / I can see it /
  it's safe". Progress visibility is a paid feature (days active, concept-level
  mastery, "what are they stuck on", what's next).
- Screen-time guilt is objection #1 (74% parents) - reframe "guilt-free
  screen time" (Lingokids positioning).
- Pricing: annual beats monthly; lifetime beats subscription for single-stage;
  per-day anchor ("chỉ Xđ/ngày") dominant in VN.
- Trial benchmarks: no-card trial->paid 8-15%; K-12 freemium 1-3%.

## VN market specifics

- IOE = national institution: 38M+ accounts, 25k schools, 4 official rounds +
  weekly self-practice. IOE itself sells prep packs 149-259k/yr via parent
  account linked to child (goEdu Parent model - proven pattern to copy).
- Spend anchor: 2.1-4.5M VND/mo/child on English (Insight Asia); total edu
  9.5M/student/yr. A 300-800k/yr app is cheap vs that frame.
- Price benchmarks: Monkey 699k/6mo, 799k/yr, 1.4M lifetime; VioEdu 999k/yr;
  IOE prep 149-259k/yr.
- Distribution: Facebook/Zalo parent groups (shareable achievements ->
  organic referrals); sales culture = tư vấn-led (Zalo OA + hotline lead
  capture complements self-checkout).
- Payments: MoMo, ZaloPay, VietQR/bank transfer mandatory - card-only loses
  most buyers.

## Benchmark funnels

- Lingokids: 7-day trial -> monthly/annual; Parents Area behind gate
  (progress center, screen-time limits, up to 4 profiles); progress report
  unlocks after 5 activities.
- Monkey Junior: 7-day trial -> tiers w/ permanent promo + per-day anchor +
  volume proof + hotline; weekly parent report (7-day summary, per-skill
  stars, cumulative) in-app + email.
- VioEdu: parent mode in student app - period-selectable overview, full
  session history w/ per-question results, teacher-assignment notifications.
- IOE/goEdu Parent: parent account linked to child - tracks progress, buys
  packages for child. THE model to copy.
- Khan Kids: free; parent dashboard links child, teacher reports emailable.
- Phòng thi ảo FLYER (closest analog - mock exams): free mock per level ->
  paid; trust numbers front+center ("600k+ học sinh", "đề sát 90%"), parent
  testimonials w/ named outcomes.

## Surfaces needed (prioritized)

P0:
1. **Parent gate** on report entry + all pricing/email/external links
   (adult task: hold-3s or math word problem).
2. **Parent-claimable remote view** - extend parent_contacts/verify into
   parent magic link or light parent account -> read-only dashboard for
   linked child. Prerequisite: server-side engagement sync (today localStorage).
   Highest-ROI feature.
3. **Enrich weekly email + report**: minutes/day, mock-IOE score trend +
   estimated band, weakest-3 skills + next-session suggestion, celebration.
4. **Shareable achievement card + printable certificate** (name+grade+stars+
   best mock score) for FB/Zalo brag -> referral.

P1:
5. Marketing landing (public route pre-login): IOE-outcome hero, free-mock
   CTA -> existing guest trial, proof numbers, grade selector as demo entry,
   parent-report preview, safety block, pricing, FAQ, Zalo/hotline footer.
6. Pricing + VN checkout: ~299-499k/năm học headline, per-day anchor, 6mo/
   lifetime tiers, MoMo/ZaloPay/VietQR + transfer, Zalo tư-vấn lead capture.
7. Guest->parent handoff: after trial round/mock exam, gated "gửi kết quả
   cho ba mẹ" email capture at win moments.

P2:
8. Sibling profiles. 9. Streak-at-risk alerts + IOE-round countdown.
10. Teacher/class dashboard (JoinClassCard exists). 11. Optional screen-time
    cap in parent view.

## Landing anatomy (evidence-backed order)

Hero outcome headline (dated exam outcome) -> proof strip -> "Con học lớp
mấy?" grade segmentation (doubles as demo entry) -> 3-step how-it-works ->
exam-alignment block -> testimonials w/ named outcomes -> safety block ->
screen-time reframe ("15 phút/ngày") -> FAQ -> pricing (per-day anchor,
wallets) -> sticky CTA + real company footer.

## Key sources
Broekman CHB2016 parent needs; PMC6099983; Brilliant/Prodigy/iMasterly parent
dashboards; Lingokids help + press + GrowthBook; ioe.vn + giaoduc.net.vn
parent-link model; Insight Asia VN spend; monkey.edu.vn pricing/report;
VioEdu parent features; phongthiao.com; Adapty/Lifecycle Architect
benchmarks; contuhoc.com communities; Transfi VN payments; Apple Kids 5.1.4;
Framer/Apexure edtech landing guides.
