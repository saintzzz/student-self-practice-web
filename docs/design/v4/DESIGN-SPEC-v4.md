# DESIGN-SPEC v4 — CR-81: De-"AI look" remediation

Owner: Designer phase for CR-81. Contract: symptom-driven fixes mapped to
the CR-81 audit (S1-S11). Brand: VieSchool navy/gold stays; the world
becomes the journey the copy already claims.

## 1. Concept

**"Bảng hành trình ban đêm" — the night-journey board.** Kid play
surfaces stop being a void: the per-grade land scene (already built in
`LandScene.tsx`) returns as a **night-lit backdrop** behind a navy
"travel board" (the question card). Adult/brand surfaces keep
`land="brand"` unchanged.

## 2. Symptom -> fix map

| Audit | Fix |
|---|---|
| S1 navy void | `LandShell` for kid play screens resolves `getLand(gradeId)` again; `LandScene` gains `night` variant - same SVG art, scene colors shifted to deep desaturated hues + lower opacity so the navy world reads as "the land at night", not a second theme |
| S2 centered column | Instruction becomes a **banner strip**: left-aligned text in a rounded speech-scroll strip (`QUESTION_BANNER` token), companion mascot sits at the banner's right end instead of floating in a corner |
| S3 bare emoji | Answer/prompt visuals sit in a **framed exhibit tile**: light inner panel (`exhibit` token) behind EmojiVisual, slight alternating tilt (-1.5deg/+1.5deg) like cards pinned to a board - tilt on the inner frame only, never the button |
| S4 violet audio button | Kill indigo->violet gradient. New `AUDIO_BUTTON`: deep-navy toy face + amber speaker icon + white label. `Kiểm tra` becomes gold primary (CTA family). `Nghe mẫu` becomes quiet navy ghost |
| S5 pill spam | One `CHIP_STAT` token (slate family) for stat pills; the gold `Câu x/10` stays as the only gold chip |
| S6 card-in-card | ModeHub: outer navy panel loses its card shell (transparent, scene shows through); accordion rows become standalone paper cards on the scene |
| S7 one radius | Codify: scene/cards `rounded-3xl`, tiles `rounded-2xl`, controls `rounded-xl`, chips `rounded-full` - verify, don't restyle blindly |
| S8 ring-only depth | Cards gain a **land-edge accent**: 4px top rim in the land's accent color + deeper board shadow; separation still shadow-first, rim is identity not elevation |
| S9 rainbow tint borders | Option tiles: unanswered = single slate frame family (`border-[#3b5280]` + toy face); color only on semantic states. Hub icon chips keep indexed tints (information, not decoration) |
| S10 one type voice | Instruction = slate-100 regular in the banner (not amber headline); hero words keep display; amber reserved for reward/round markers |
| S11 dead mid-band | Mitigated by the scene framing the board + content my-auto centering; sheet reserve unchanged (CR-73 contract) |

## 3. Contracts kept

- All testids, aria names, `data-*` verdict attrs, pointer/drag/demo
  contracts from CR-79 unchanged - this pass is visual only.
- Touch floors (76/64/48) unchanged; `touch-action` rules unchanged.
- Reduced-motion: scene keeps `land-*` keyframe rules already in place;
  no new motion added.
- Exam surface (`ExamScreen`) untouched - stays formal.
- `beheo-force-guest`, auth gates, pricing/copy unchanged.

## 4. Implementation map

| File | Change |
|---|---|
| `src/lib/ui/theme.ts` | + `night` scene palette per land (scene hue tokens) |
| `src/components/scene/LandScene.tsx` | `night?: boolean` - wraps scene groups in dark-recolored variants (reuse art, new fills) |
| `src/lib/ui/tokens.ts` | + `QUESTION_BANNER`, `AUDIO_BUTTON`, `exhibit`, `CHIP_STAT`; revise `toy.tints` usage |
| `src/App.tsx` | `shell(node, gradeId)` resolves real land for kid surfaces (BatchScreen, summaries, ModeHub/StartBatch); `brand` for adult screens |
| `src/components/BatchScreen.tsx` | scene layer under the column (replace `scene.glow`) |
| `src/components/QuestionCard.tsx` | board treatment: land rim accent + banner area; mascot moves into banner row |
| 11 question components | instruction block -> `<QuestionBanner>` shared component |
| `optionButtonStyle.ts` + image-tile components | single unanswered frame + exhibit wrap for emoji options |
| `ModeHub.tsx` | de-nest; rows on scene |
| `FeedbackPanel`/round+batch summary | CHIP_STAT unify; buttons to 3-role system |

## 5. Verification

- tsc + full vitest green; build green.
- Screenshots at 390x844 / 844x390 / 1280x800 on grades 1,3,5 covering:
  question card with banner+scene, feedback sheet, round summary.
- Contrast: banner text slate-100 on navy >= 4.5:1; chip text on its bg.
- External review loop to clean.
