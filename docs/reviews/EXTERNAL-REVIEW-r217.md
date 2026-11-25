# External Review - Round 217 (codex)

Reviewer: codex (real external run). Scope: commit 1657e6b, HEAD=1657e6b.

1. [major] scripts/cr143-verify.mjs:50 - The first picker button is `game-art-pet` (GameScreen.tsx:39), which only wiggles the artwork. No level starts, yet the script saves a “game-play” screenshot and passes. - Click `getByTestId('game-level-1')` and assert the picker disappears and gameplay is visible before capture.

2. [major] scripts/cr143-verify.mjs:63 - Blocking Supabase requests does not reliably hold the splash: this fresh browser context has no session, so `auth.getSession()` can resolve locally and dismiss loading before `goto()` returns. The mandatory wait then fails on a healthy app. - Deterministically hold auth initialization using a seeded session and intercepted request, or a controlled test hook, then assert the splash.

Static review only; localhost:5173 was unavailable.

