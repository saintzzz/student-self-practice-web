# Research: Kids EdTech UX Benchmarks (Phase 0.5 input)

Source: independent research subagent report. Full citation list preserved at bottom.

## Benchmark patterns (Duolingo ABC, Khan Kids, Endless, Lingokids, Epic, Monkey/VioEdu/Alokiddy)

Shared skeleton across benchmarks:
1. Dual interfaces: kid surface (icon+voice, no reading) / parent surface (text, dashboards, payment) behind a **parent gate**.
2. One adaptive guided path + one free-choice area (Khan Kids Journey + Library).
3. Character with emotional states (celebrate / encourage / think) delivering verbal instructions.
4. Reward = collectible with a *home* (character room, sticker scene, hatched pet).
5. Bite-sized 5-15 min loops with natural stopping points.
6. No-fail/soft-fail error handling; wrong answer -> encouragement + demonstration.

Notable mechanics:
- Duolingo ABC: parent-gate "type the spelled-out number"; mic-permission warm-up modal; narration + icon pulse synced to phoneme audio.
- Khan Kids: every text element tappable -> reads aloud; animated walkthrough demonstrates the answer when stuck; process-specific praise ("You traced the letter D"); language-agnostic feedback sounds (cheerful ding vs gentle bong).
- Endless Alphabet: zero fail states; letters vocalize phoneme while dragged - audio fires during interaction.
- Lingokids: star->sticker->scene-book collectible loop; star counter resets daily (no-punish habit); rewards only for distinct activities; UC Davis efficacy study (15min/day, 3d/wk).
- Epic: word-highlight during "Read to Me" narration; egg-hatch collectibles.
- Monkey Junior: 1v1 speaking duels (validates our Arena); lifetime pricing ~400-1400k VND sells well in VN.
- VioEdu/VioKids: 5-minute lessons; parent competency reports mapped to skills.

## Pre-reader UX principles

- **Age bands**: NN/g distinguishes 3-5 / 6-8 / 9-12 -> grades 1-2 need voice-first mode; grades 4-5 can take denser text UI. Age-band-aware UI, not one-size.
- **Voice-first**: every instruction tappable+read aloud; auto-play once on entry; persistent speaker icon; pulse icon in sync with audio.
- **Icons**: familiar real-world metaphors only (play, book, star, speaker, trophy); icon+label; spatial/map nav.
- **Touch targets**: NN/g recommends >=2cm (~76px) for under-9 - our `min-h-[76px]` invariant already matches; 36px chips must never appear on kid surfaces; option buttons get full 76px. Near-miss forgiveness (holdover touches).
- **Session length**: 5-10 min rounds, natural "done" fork; 15min/day target.
- **Error handling**: gentle sound (never buzzer), visual outcome feedback embedded in the response (highlight correct after 1-2 tries / let them fix), spoken encouragement, optional demo. Never remove earned rewards; never red-X-and-advance.
- **Typography**: infant characters (single-storey a/g, large x-height); **Andika** is the free purpose-built literacy font with full Vietnamese coverage - audit Baloo 2 / Be Vietnam Pro glyph forms, use Andika for reading passages if they fall short. Size ~18-24px equivalent grade 1-2 stepping to ~16px grade 5. Sentence case, left-aligned, generous line-height; never all-caps/justified.

## Rewards & motivation (evidence)

- Streaks work (NBER RCT, ~60k students) - keep, but with forgiveness framing ("3-4 buổi/tuần là tuyệt"), daily-reset quests (Lingokids).
- Collectibles with a home > abstract points; pick-1-of-3 unboxing adds agency.
- Informational framing preserves intrinsic motivation; controlling framing backfires.
- Points-for-everything makes kids game the metric - reward only completed learning objectives.

## Dark-pattern boundaries (hard rules)

JAMA typologies to avoid: parasocial guilt ("mascot will be sad"), fabricated time pressure, navigation traps, attractive purchase lures. ICO Children's Code: no nudges toward weaker privacy; nudges toward wellbeing OK. Apple Kids: parent gate before purchases/links, no third-party ads/analytics touching identifiers.

## A11y for children

WCAG AA floor (already enforced); aim AAA 7:1 on kid reading text. COGA patterns: one purpose per page, chunk content, one instruction at a time, undo/go-back, controls never move. Color+non-color redundancy always (icon/sound alongside emerald/rose). `prefers-reduced-motion` honored. One primary action per screen (grades 1-2).

## Top recommendations adopted into PRD candidates

A. Kid/parent register split + parent gate (hold-3s or math-word task).
B. Voice-everything grades 1-3: `InstructionAudio` pattern (autoplay once + persistent speaker + tap-to-hear + pulse sync).
C. Real mascot system: illustrated/Lottie character with celebrate/encourage/think states, verbal guidance, never guilt.
D. StartBatchScreen: <=2 decisions for G1-2 (one CTA + speaker); progressive disclosure carousel for the rest.
E. Outcome feedback: soft bong + highlight/fix-it + demo on repeat misses.
F. Collectible home for existing stars/pet (gift box -> pick 1 of 3 -> item lands in scene).
G. Typography: Andika for reading text if glyph audit fails; band-scaled sizes.
H. Session: round end -> "Xong rồi / chơi tiếp?" fork, no infinite chaining.

## Key sources
NN/g children's usability + physical development (2cm targets) + cognition reports; Anthony/CHI touch; Hourcade "It's Too Small"; TIDRC IDC'19; Andika (SIL); Reading U. digital texts; PLOS/Wiley font-size studies; NBER streaks WP34173; PMC6566098 points-backfire; CHI reward-interpretation; CHI'18 feedback analysis; Critter Corral; JAMA manipulative-design study; ICO Children's Code; Apple Kids 1.3; FTC COPPA; W3C COGA; WCAG 2.2; Duolingo ABC blog + teardown; Khan Kids ELL design + teardown; Lingokids help/prototyping/GrowthBook; Epic teardown; Originator; monkey.edu.vn; FPT VioKids; Alokiddy listing.
