# ART REVIEW - Designer audit of question & kid-facing imagery

**Scope:** every image / illustration / emoji-rendered visual inside questions
and their answers, plus the immediately adjacent kid-facing surfaces
(feedback panel, games, rewards). Audience: Vietnamese primary students G1-5.
Benchmark: Duolingo ABC / Lingokids / Khan Academy Kids (kids-edu register).
Read-only audit - no source was changed.

---

## 1. Executive summary

| Dimension | Score /5 | Note |
|---|---|---|
| Consistency | 3 | One canonical pipeline (`EmojiVisual` + `ArtImg`) is well built, but ~10 raw-emoji bypasses, per-option (not all-or-nothing) art fallback in games, and two unretired placeholder/diagram asset families break it. |
| Appropriateness | 4 | The kawaii bespoke-art family is genuinely benchmark-grade (soft-3D, friendly faces, culturally resonant e.g. `concept-vietnam-f3e3e2.webp`). Docked for `v6/` placeholder cards with embedded English labels that can leak answers, and a toolbox emoji standing in for a treasure chest. |
| Coverage | 3 | Vocab art covers **100% of the 1,190-word bank**, yet four question kinds (`counting-image`, `describe-and-choose-image`, `picture-pair-matching`, `phonics-*-choice` prompts) and two game surfaces can never reach it. |
| Quality | 4 | vocab/concepts/mascot/lands/pets/stickers/games art is high quality and format-consistent (512x512 webp / 256-320px collectibles). Docked for `v6/` placeholder cards and missing `onError` on the exam prompt image. |

**Headline:** the asset library is better than the wiring. A coherent,
approved kawaii art system already covers every word in the bank; the
remaining work is routing it into the question kinds that still render
emoji-only, retiring the placeholder `v6/` art, and closing the
emoji-bypass + fallback-granularity gaps.

### Visual system inventory

| # | System | Style | Where used | Count / format |
|---|---|---|---|---|
| 1 | Vocab art | Bespoke kawaii AI (soft-3D, faces, baked white bg, no alpha) | Question prompts/options via `EmojiVisual imageUrl`, feedback picture, flashcards, games | `public/images/vocab/` - 1,190 x webp 512x512 |
| 2 | Concept art | Same kawaii family (vocab files are mostly byte-identical copies; ~1,140/1,190 same md5) | Bank `asset_paths` for `image-to-word-mcq`, `word-to-image-mcq` option art | `public/images/concepts/` - 1,201 x webp 512x512 |
| 3 | Twemoji SVG | Flat emoji | Every emoji via `EmojiVisual` fallback chain; counting/describe/pair-matching imagery | `public/emoji/svg/` - 1,186 svg |
| 4 | Noto animated emoji (Lottie) | Animated emoji | Single-emoji prompt slots when `animated` granted by `LottieBudget` | `public/emoji/lottie/` - 310 json |
| 5 | Land scene art | Painterly golden-dusk environments | Screen backdrops (`LandArt`, tone filters, day variants, vector `LandScene` fallback) | `public/images/lands/` - 13 webp 1024x1024 |
| 6 | Mascot poses | Same kawaii family (Be Heo pig) | Board perch, feedback sheet, heroes (`MascotArt`) | `public/images/mascot/` - 7 webp 512x512 |
| 7 | Collectibles | Same kawaii family | `ArtImg` consumers: stickers, pets, home shelf, game picker cards, hub emblems | `stickers/` 20, `pets/` 10, `home/` 24, `games/` 15, `emblems/` 7 webp |
| 8 | Counting art | Same kawaii family (N objects per image) | **No client reference found** - intended for bank `visual-count-mcq` via `asset_paths` | `public/images/counting/g1-g5/` - 100 webp 512x512 |
| 9 | V6 science/math art | **Placeholder cards**: white card + "Grade N ... observation" header + crude line diagram + embedded English labels | Bank `asset_paths` for science/math mcq rows | `public/images/v6/` - 120 webp 640x400, only ~15 unique images |
| 10 | Math-VI diagrams | Flat SVG schematics (blue blocks/lines, `<text>` elements, vi aria-label) | Bank `asset_paths` for math-vi | `public/images/v6/math-vi/` - 1,008 svg 360x220 |
| 11 | V3 science art | Kawaii webp (older set) | Bank `asset_paths` (legacy) | `public/images/v3/science/` - webp 512x512 |
| 12 | SVG icon set | Deterministic UI chrome + reward art (`IconChest`, `IconStar`) | Buttons, chips, `ChestReveal` | `src/components/icons.tsx` |
| 13 | Raw platform emoji | OS emoji font (varies per device) | Bypasses: `StoryTime`, `PetCard` fallback, `ListenButtons`+4 phonics "Nghe cham", `ClassShowScreen` avatars/podium, `RoundStub`, `ExamScreen` review row, `StartBatchScreen` | scattered literals |

### Render pipeline (what is already good)

- `EmojiVisual` (`src/components/EmojiVisual.tsx:45`) - single render path,
  one-way chain `image -> lottie -> svg -> native`, sr-only emoji text node
  preserved, lottie session breaker, reduced-motion aware.
- `ArtImg` (`src/components/ArtImg.tsx:11`) - collectible webp with emoji-keyed
  fallback.
- `LandArt` (`src/components/scene/LandArt.tsx:31-41`) - day-art -> base-art ->
  vector engine chain, never a broken scene.
- All-or-nothing photo groups in `ListeningImageChoiceQuestion` (lines 53-61)
  and `PhonicsWordChoiceQuestion` (lines 65-70) - one failure drops the whole
  option set to svg, never a half-art half-emoji question.
- `imageSemantics.ts` (`isLiteralImageWord`) - curated blocklist keeps
  figurative words and flags out of image-prompted generators; the audited art
  itself correctly disambiguates hard words (`vocab/orange.webp` renders a
  crayon + orange splat for the COLOR sense, not the fruit).
- Attribution governance: `public/attribution.json` covers all 1,190 vocab
  images + 8 collections (Twemoji/Noto CC-BY-4.0, bespoke art proprietary).

### Question-kind coverage map

| Kind (practice `QuestionCard`) | Body visual | Art? |
|---|---|---|
| `image-choice` | Prompt exhibit | YES - vocab webp wins over lottie |
| `listening-image-choice` | 4 option exhibits | YES - all-or-nothing group |
| `phonics-word-choice` | 4 option exhibits | YES - all-or-nothing group |
| `letter-tracing` | Exhibit word | YES |
| `counting-image` | Prompt + options | NO - repeated Twemoji; `counting/` art unused |
| `describe-and-choose-image` | 4 options | NO - repeated Twemoji; `optionWordIds` carried but unused |
| `picture-pair-matching` | Picture tiles | NO - `EmojiVisual` without `imageUrl` |
| `phonics-sound/final/blend/rhyme` | Prompt exhibit | NO - `question.emoji` only, never `imageUrl` |
| `extra-letter` | Letter tiles | By design (image would leak answer); feedback picture YES |
| `listening-fill-blank` / `listening-sentence-fill-blank` | Audio only | By design |
| `pronunciation-recording` | Word text only | NO - and excluded from the feedback picture too |
| FeedbackPanel picture | Post-answer | YES for ~10 kinds (`feedbackPictureWordId`) |

| Kind (exam `ExamQuestionView`) | Body visual | Art? |
|---|---|---|
| `grammar-mcq` (mcq/image-to-word/word-to-image/visual-*) | Prompt img + optional 4 option imgs | YES - bank art; option imgs fall back to label text |
| `text-answer` | Prompt img | YES - same `PromptLine` |
| `image-choice` (legacy) | Exhibit | NO - `EmojiVisual` without `imageUrl` (Twemoji only) |
| others | text | - |

| Game surface | Visual | Art? |
|---|---|---|
| `EmojiChoiceField` options (BalloonPop, FishingCatch, WhackMole, FeedThePig) | 4 options | Partial - per-option `optionWordIds` lookup; NOT all-or-nothing |
| OddOneOut tiles | 4 word cards | YES - per-word, same single-option degradation risk |
| Single-word prompt (PictureReveal, CastleGuard, GoldQuest, MissingLetter, SayItLoud, RacingCars, QuizShow, TicTacToe) | Exhibit | YES |
| MemoryMatch / `PairBoardField` | Emoji faces | NO - Twemoji only |
| MazeChase answer pads | Cell emoji | NO - Twemoji |
| StoryTime picker/read | Story emoji | RAW native emoji (bypass) |
| TreasureChest chest | 🧰 toolbox + 🔒 | Twemoji, wrong object (see F-05) |
| FeedThePig pig | 🐷/😋 | Twemoji vs bespoke mascot pig |

---

## 2. Findings

| # | Sev | File / asset | Issue | Recommendation |
|---|---|---|---|---|
| F-01 | **Critical** | `public/images/v6/science/*.webp`, `public/images/v6/math/*.webp` (120 files) | Placeholder art in kid-facing exam questions: white card + "Grade N science observation / visual reasoning" header + crude black line diagrams. Science has only ~15 unique images duplicated x4 across grades (md5-verified: e.g. `v6-sci-g2-00-aa324e.webp` and `v6-sci-g5-00-413362.webp` are the SAME plant diagram with only the grade label swapped). Embedded English labels ("leaf", "stem", "roots") bake text into the image - can leak or contradict the answer, is unlocalizable, and is invisible to screen readers. | Quarantine `v6-sci-*`/`v6-math-*` from `asset_paths` (a text-only question beats a misleading image), then regenerate through the mathvi-style SVG diagram pipeline or the kawaii art pipeline. Strip all baked-in text. |
| F-02 | **High** | `src/components/ExamScreen.tsx:1696-1703` (`PromptLine`) | Prompt `<img>` has `alt=""` and **no `onError` fallback** - a missing bank asset renders a broken-image icon above the prompt (an "answerable" question with no visible content). The sibling `OptionImg` (line 1711) does fall back to the label - inconsistent. | Give `PromptLine` the `OptionImg` treatment: onError -> hide image (the prompt text already carries the question), and `aria-label`/alt describing the depicted object where the bank knows it. |
| F-03 | **High** | `src/games/mechanics.tsx:88-90`, `src/games/games/OddOneOut.tsx:91` | Per-option art resolution in games is NOT all-or-nothing: one failed `getWordVisual` image drops that single option to Twemoji while the other three keep kawaii art - mixed art styles inside one answer set. Practice rounds enforce the group rule (AC-5.3); games bypass it. | Hoist option image resolution to the field level with the same "all four or emoji" rule used in `ListeningImageChoiceQuestion`/`PhonicsWordChoiceQuestion`. |
| F-04 | **High** | `PicturePairMatchingQuestion.tsx:95,160`; `DescribeAndChooseImageQuestion.tsx:80-82`; `CountingImageQuestion.tsx:44-48,63-66` | Four practice kinds can never show curated art: pair-matching picture tiles and describe/counting options render repeated Twemoji only - while `listening-image-choice`/`phonics-word-choice` options show full art. `DescribeAndChooseImageQuestion` even carries `optionWordIds` that are ignored for imagery. `public/images/counting/` (100 purpose-built N-object images) has zero client references. | Pair-matching tiles: pass `imageUrl` via the tile's word id (tiles already carry word identity). Describe/counting options: either use the count-* art (single image of N objects) or keep repeated-emoji as the count semantic - but make it a deliberate spec decision and wire `counting/` art or delete the dead 2.9MB. |
| F-05 | **High** | `src/games/games/TreasureChest.tsx:114,122` | The game's namesake prop is a 🧰 TOOLBOX Twemoji (not a treasure chest) + 🔒/🔓, while bespoke `public/images/games/treasure-chest.webp` exists and DESIGN_SYSTEM.md section 15 mandates deterministic SVG/art reward chrome ("not `EmojiVisual`"). Wrong object depicted + style violation + own-card-art mismatch. | Render `games/treasure-chest.webp` (or `IconChest`) as the chest; keep locks as deterministic SVG or the card art's own padlock motif. |
| F-06 | **Medium** | `ExamScreen.tsx:1556-1562` | Exam `image-choice` renders `EmojiVisual` with no `imageUrl` - Twemoji-only inside an exam where `grammar-mcq` prompts show kawaii bank art. Mixed registers within one paper. | Resolve the word's art through the same `imageUrl` path (the question type already carries `wordId`). |
| F-07 | **Medium** | Raw emoji bypasses (OS-font, not Twemoji): `StoryTime.tsx:251`; `PetCard.tsx:29` (img-fail fallback); `ListenButtons.tsx:34` + `PhonicsWordChoiceQuestion.tsx:107`, `PhonicsRhymeChoiceQuestion.tsx:83`, `PhonicsEndingChoiceQuestion.tsx:85`, `PhonicsSoundChoiceQuestion.tsx:80` (🐢); `ClassShowScreen.tsx:37,276,353,374,529` (avatars + podium medals); `ExamScreen.tsx:1897` (🏁); `StartBatchScreen.tsx:362` (🎤); `RoundStub.tsx:22` (🚧) | Every one renders in the device emoji font - different color/line weight than the Twemoji layer the design system standardizes on. Worst on Android/Windows vs iOS. Kid-facing on most of these. | Route every literal through `EmojiVisual` (single render path is already the constitution). The 🐢 "Nghe cham" is copy-pasted in 5 places - hoist into `ListenButtons` once. |
| F-08 | **Medium** | `public/images/vocab/` vs `public/images/concepts/` | ~1,140 vocab files are byte-identical copies of their concept twins (md5-verified) - ~31MB shipped twice under two URL namespaces, and the two sets can drift (13 legit diffs incl. `rice`, `apricot-blossom` = regenerated variants). | Single canonical dir + path alias in the asset manifest; or document the split (bank assetIds -> concepts, wordIds -> vocab) and dedupe at build. |
| F-09 | **Medium** | `src/games/games/FeedThePig.tsx:105` | The pig you feed is generic Twemoji 🐷/😋 while the app's own mascot (`mascot/be-heo-*.webp`) is a bespoke kawaii pig - two different "pigs" on adjacent surfaces. | Use `be-heo` pose art (idle -> celebrating on feed) - free character consistency. |
| F-10 | **Medium** | `PronunciationRecordingQuestion` + `QuestionCard.tsx:310-331` | The only practice kind with zero imagery: word text + mic, and `feedbackPictureWordId` excludes it, so the word's art never appears even after answering - inconsistent with every other kind's "see the thing" feedback. | Show the word art as a comprehension aid next to the word (it cannot leak - the word itself is shown), and/or include `wordId` in the feedback picture map. |
| F-11 | **Low** | `ExamScreen.tsx:1701,1714` (`art-breathe` + `animationDelay` up to 2.1s) | Infinite 5s breathe on exam prompt/option images, staggered per option so the four images oscillate out of phase - playful motion on the deliberately "formal register, no tilt/soft-3D" exam surface. Reduced-motion kills it, but the default read is off-register. | Drop `art-breathe` on the exam paper (keep it in play surfaces), or reduce to a one-shot settle. |
| F-12 | **Low** | `mechanics.tsx:286` (56px letter bubbles), `MazeChase.tsx:258` (48px cells), `QuizShow.tsx:154` (48px) | Arcade play-field hit targets below the kid floors (76px G1-2 / 64px G3-5) that option tiles meet. | Widen cells to >=64px on G1-2 or mark grids `touch-none`+larger; at minimum record the exception in DESIGN_SYSTEM. |
| F-13 | **Low** | `EmojiVisual` in `image` mode | Art `<img>`s are `alt=""` + `aria-hidden` with the emoji char sr-only - the SR user hears e.g. the emoji name while sighted users see a richer picture (crayon+splat for "orange"). Acceptable parity, but for `image-choice` the SR question is literally unanswerable either way. | Where a word exists, put the word (or its vi gloss) as the image's sr label instead of the emoji char; keep aria-hidden on the visual. |
| F-14 | **Low** | `public/attribution.json` collections text | Says concept illustrations are "rendered from Noto Color Emoji glyphs" - stale; inspected files (`concept-pencil`, `concept-scissors`, `concept-vietnam`, `concept-rice`, `concept-dentist`) are bespoke kawaii art. Provenance doc lies about the asset pool. | Update collection descriptions to match the regenerated files. |
| F-15 | **Info** | `assets`: `home/`, `pets/`, `stickers/`, `games/`, `emblems/` | Consistent 256-320px webp collectibles with emoji fallbacks via `ArtImg`/`GameArt` - good pattern; just note `home/` items duplicate vocab subjects (ball, kite, teddy...) at lower res. | Keep; consider sharing the vocab art at `object-contain` instead of a second render set. |

Screenshot evidence: `_shots/ux-audit/audit-tablet-04-batch-q2-feedback.png` (image-choice prompt = vocab kawaii art, correct), `_shots/ux-audit/p3-phone-22-game-play.png` (OddOneOut all-art tiles), `_shots/cr143/desktop-50-game-play.png` (OddOneOut tiles at desktop), `_shots/ux-audit/audit-desktop-04-batch-q1.png` (image-choice prompt = `vocab/ear.webp` art).

---

## 3. Style bible recommendation

**Owner system: the bespoke kawaii illustration family (vocab + concepts +
mascot + lands + collectibles), rendered always through `EmojiVisual`'s
`image` mode or `ArtImg`.** It is already attribution-governed, audit-pipelined
(`artgen-out/_audit*`), semantically curated (`isLiteralImageWord`), and
benchmark-true to Duolingo ABC/Lingokids register (single object, soft-3D
volume, white stage, face-optional, 512px webp).

**Twemoji stays what DESIGN_SYSTEM already says it is: the pedagogical
fallback + decorative watermark layer - never the primary answer visual when
audited art exists.** Lottie animates only single-picture prompt slots under
the budget allocator (current behavior is correct).

### Gap list to reach the bible

1. Retire or regenerate `public/images/v6/` placeholder art (F-01) - the only
   asset family that is visibly off-bible *and* pedagogically risky.
2. Wire art into the four art-blind practice kinds (F-04): pair-matching tiles
   + describe/counting options via their existing `optionWordIds`; decide
   count-* art vs repeated-emoji deliberately; same for `phonics-*` prompts
   and exam `image-choice` (F-06).
3. One fallback rule everywhere: extend the all-or-nothing photo group to
   `EmojiChoiceField` + `OddOneOut` (F-03); add `onError` to exam `PromptLine`
   (F-02).
4. Zero raw-emoji literals on kid surfaces (F-07) - `EmojiVisual` or nothing.
5. Fix the two object-semantic bugs: toolbox-chest (F-05), generic pig vs
   mascot pig (F-09).
6. Housekeeping: dedupe vocab<->concepts bytes (F-08), verify or drop
   `counting/` + `v3/` wiring, refresh attribution collection text (F-14),
   record the arcade-tile touch-target exception or fix it (F-12).

*Audit artifacts: asset counts/dupes verified via filesystem md5; coverage via
`data/vocabImages.ts` (1,190 keys) x `data/vocabulary/**` word-id census
(524 literal + 666 `xp()` words - every id has art); render paths traced in
`QuestionCard`, `ExamQuestionView`, `mechanics.tsx`, and the 18 game files.*
