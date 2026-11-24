# Feature Map - student-self-practice-web (English Arena)

> Vite + React SPA for student self-practice. Mined 2026-11-24 (intake brownfield rule).
> Screen state lives in `src/App.tsx` (`Screen` union: login|admin|grade-select|start-batch|batch|credits|placement|exam|report|flashcards|game|classshow).

## Auth: login + email verify
- **Purpose:** student/admin sign-in; parent email verify-link landing
- **Route:** SPA (index.html) — screen `login`
- **Preconditions:** none; seeded accounts for role flows
- **Navigation:** AuthScreen -> grade-select (student) | admin (admin account)
- **Controls:** `data-testid="verify-email-continue"`
- **Expected:** student lands grade-select; admin lands admin; verify-link renders its own outcome screen
- **Code entry:** `src/App.tsx`, `src/components/AuthScreen.tsx`
- **State owner:** `src/App.tsx` (`screen`, auth state); RewardFxContext for FX only
- **Updated:** 2026-11-24 | by intake FM mining

## Kid play loop: grade-select -> start-batch -> batch -> game/flashcards
- **Purpose:** pick grade, start a practice batch, play questions, optional game/flashcard detour
- **Route:** screens `grade-select` `start-batch` `batch` `game` `flashcards`
- **Navigation:** grade -> start-batch -> batch (primary play surface, eagerly loaded); batch exit -> games/flashcards
- **Controls:** batch question controls in `src/components/BatchScreen.tsx`; `data-testid="assignment-submit-ok"`, `assignment-submit-blocked`, `assignment-due`
- **Expected:** batch progresses questions, score/reward state persists; game exit returns to hub ('games' sub-screen)
- **Code entry:** `src/components/StartBatchScreen.tsx`, `src/components/BatchScreen.tsx`, `src/components/flashcards/FlashcardScreen.tsx`
- **State owner:** `src/App.tsx` screen state + round/batch state inside BatchScreen
- **Updated:** 2026-11-24 | by intake FM mining

## Arena: live lobby -> exam duel -> podium
- **Purpose:** create/join live arena race by code, run timed duel, standings
- **Route:** lobby overlay over hub + screen `exam`
- **Controls:** `data-testid="arena-live-code"`, `arena-live-create`, `arena-live-join`, `arena-live-start`, `arena-live-roster`, `arena-live-standings`, `arena-live-podium`, `arena-verdict`, `arena-result`, `arena-exit`
- **Expected:** create -> lobby -> start -> exam questions -> standings/podium; join-by-code path symmetric
- **Code entry:** `src/components/ArenaLiveLobby.tsx`, `src/components/ExamScreen.tsx` (`arenaRun` state in App.tsx)
- **State owner:** `src/App.tsx` (`arenaRun`), lobby realtime state in ArenaLiveLobby
- **Updated:** 2026-11-24 | by intake FM mining

## Admin: account management
- **Purpose:** create/list student accounts, admin actions
- **Route:** screen `admin`
- **Preconditions:** admin account signed in
- **Controls:** `data-testid="account-create-form"`, `account-create-submit`, `account-displayname`, `account-username`, `account-pin`, `account-list`, `admin-error`, `admin-practice`, `admin-signout`
- **Expected:** create account -> appears in list; signout returns login
- **Code entry:** `src/components/AdminScreen.tsx`
- **State owner:** AdminScreen local state + account API layer
- **Updated:** 2026-11-24 | by intake FM mining

## Placement + Parent report + ClassShow + Credits
- **Route:** screens `placement`, `report`, `classshow`, `credits`
- **Purpose:** placement test -> parent-facing progress report -> class showcase -> credits page
- **Code entry:** `src/components/PlacementScreen.tsx`, `src/components/ParentReportScreen.tsx`, `src/components/ClassShowScreen.tsx`, `src/components/CreditsScreen.tsx`
- **State owner:** per-screen local state; report reads persisted progress
- **Updated:** 2026-11-24 | by intake FM mining
