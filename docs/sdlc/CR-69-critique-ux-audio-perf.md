# CR-69 - Critique follow-ups: UX fixes + audio playback perf

**Status: DEPLOYED (2026-10-13)** - live on ea.vieschool.com via
git auto-deploy (commit e8d99a6). Lead review (reviewer-gpt) found 3
issues - all fixed pre-merge: audio listener cleanup, real modal focus
management, stale submitConfirmOpen across retry. Verified on prod:
live-score hidden pre-answer, KẾT THÚC 44px, centered confirm dialog,
reward-free empty summary for 0-answer batches, zero console errors.
Unit 1022/1022, e2e 13/13 relevant specs green, reliability gates clean.

## Source

Impeccable critique (dual-agent, 2026-10-13) on the live practice flow +
manual audio-path audit. Evidence: `.review-shots/` screenshots,
`detect-src.json`, Supabase storage response headers.

## Scope

### UX defects (P0-P2)

1. **P0 invisible reward text** - `RoundSummary.tsx:92` sticker chip
   `bg-amber-100` + `text-amber-100` (amber-on-amber, unreadable). Fix:
   `text-amber-900`, matching ChestReveal.tsx:56. Add a grep gate for
   `bg-*-100.*text-*-100` to the reliability/consistency check.
2. **P1 touch targets < 44px on a kids app** - KẾT THÚC (79x28),
   "Chơi thử lớp khác" (~20px), exam-nav numbers (32px), grade-select
   pills (36-40px, `!min-h-0` overrides defeating the 76px NAV_PILL
   invariant at GradeSelect.tsx:71,81,91), drill/exam program buttons
   (36px). Fix: floor interactive elements at 44px; remove the
   `!min-h-0` overrides.
3. **P1 destructive exits without confirm** - KẾT THÚC (BatchScreen)
   and NỘP BÀI (ExamScreen) end the session on one mis-tap. Fix:
   one inline confirm step ("Kết thúc bài? Em sẽ xem điểm luôn nhé" -
   Đồng ý / Chơi tiếp).
4. **P2 reward economy pays out for quitting** - `BatchSummary.tsx:44-58`
   awards chest + stars + "first batch" sticker + streak + quest credit
   on mount even with 0 answered questions. Fix: gate awards on
   `totalQuestions > 0`; show a gentle "em chưa làm câu nào - quay lại
   chơi nhé" state instead of celebration.
5. **Minors (same pass)**: swap action colors in
   `PronunciationStatusMessage.tsx:31-40` (retry=safe not rose,
   skip=neutral); hide `LiveScore` "0 điểm (0/0 đúng)" until first
   answer; meta description gains Vietnamese diacritics; PIN reveal
   toggle on AuthScreen.

### Audio playback perf (listening / vocab read-aloud)

6. **Client-side audio cache** - `ea-audio` mp3s are served
   `Cache-Control: no-cache` (verified), so every "Nghe lại" revalidates
   over the network. Add `Map<text, HTMLAudioElement>` cache in
   `speech.ts` (bounded ~20 entries); replays become instant.
7. **Prefetch on question mount** - `audioUrlFor` only runs on tap, so
   first play waits on network + decode. Add `preloadAudio(text)` to
   `speech.ts`; `useAudioPlayback` calls it in a mount effect so the mp3
   buffers before the child taps "Nghe".
8. **Preconnect** - `<link rel="preconnect">` to the Supabase origin in
   `index.html` to shave TLS setup on first storage fetch.
9. **sfx element reuse** - reuse one `HTMLAudioElement` per SfxName
   instead of constructing per play.

### Explicitly deferred

- **StartBatchScreen restructure** (~16 tap targets, 9 exam CTAs) - real
  IA change, needs its own design pass; recorded as separate CR when
  picked up.
- **Detector warnings** (`gray-on-color` in DebugAudioScreen/
  ReviewQueueCard, `ai-color-palette` indigo gradients, `side-tab`,
  `bounce-easing`) - cosmetic, audit separately.
- AuthScreen signup/forgot-PIN - product decision, not a defect.
- Instruction read-aloud for pre-readers - new feature, separate CR.

## Impact assessment

- **Files touched**: `src/lib/speech.ts`, `src/hooks/useAudioPlayback.ts`,
  `src/components/RoundSummary.tsx`, `BatchSummary.tsx`, `BatchScreen.tsx`,
  `ExamScreen.tsx`, `GradeSelect.tsx`, `AuthScreen.tsx`,
  `PronunciationStatusMessage.tsx`, `LiveScore.tsx`, `index.html`,
  `optionButtonStyle.ts`/`actionButtonStyle.ts` where heights are set.
  ~12 files, all client-side. No DB/RPC/schema changes.
- **Requirements affected**: reward economy semantics (4), session-exit
  behavior (3) - both change observable behavior, hence CR not minor fix.
- **Existing features**: audio cache/prefetch must preserve the
  file->TTS fallback chain and the `playbackFailed` warning path;
  confirm dialog must not break the `batch-end-early` testid used by
  Playwright flows (keep testid on the confirm path or update specs).
- **Risk**: low - no data model, no API contract, no auth surface.
  Medium: BatchSummary gating changes quest/streak credit rules - check
  `quest`/`streak` side-effects still fire for genuinely-completed
  batches (totalQuestions counts answered, not visited).
- **In-flight work**: none touching these files (git status clean at
  d17ad2b).

## Estimate

~1 dev-day equivalent: UX items are 1-15 lines each + a confirm-state
addition; audio cache/prefetch ~50 lines + tests; test updates for
end-early confirm and BatchSummary gating. One deploy.

## Acceptance criteria

- AC-69.1 Given round summary shows a new sticker, when the chip renders
  then "Huy hiệu mới" text is readable (contrast >= 4.5:1).
- AC-69.2 Given any interactive element in the play flow, when measured
  then min hit area >= 44x44px.
- AC-69.3 Given a running batch or exam, when the child taps KẾT THÚC/
  NỘP BÀI then an inline confirm appears; session ends only on Đồng ý.
- AC-69.4 Given a batch ended with 0 answered questions, when
  BatchSummary mounts then no chest/stars/sticker/streak are awarded
  and a "come back and play" state shows instead of celebration.
- AC-69.5 Given a listening question mount, when the child taps "Nghe"
  then audio starts from the prefetched buffer (no network wait when
  the mp3 exists); "Nghe lại" replays from cache with no network
  revalidation (verified in devtools).
- AC-69.6 Given a missing mp3, when playback is attempted then the
  Web Speech fallback + `playbackFailed` warning still work unchanged.
