# External Review - Round 160 (codex)

Reviewer: codex (real external run). Scope: commit 041b927, HEAD=041b927.

1. [major] src/games/games/SayItLoud.tsx:159 - Passing hook options unchanged enables server assessment: the hook prefers server capture when configured, and `serverScore` changes the pass threshold from 70 to 90. This contradicts CR-120’s local-scoring scope and can reject a 70-89 attempt - explicitly configure the capture/scoring mode to match the approved requirement.

2. [major] src/games/games/SayItLoud.tsx:196 - Feedback disappears after 1.1 seconds without a live region; removing the focused mic button also drops keyboard focus. Screen-reader users can miss the verdict and next word entirely - announce results through a persistent status region and manage focus when each round starts.

3. [minor] src/games/games/SayItLoud.tsx:45 - Permission-denied instructions promise that “Thử lại” opens a permission prompt, but `retry()` only returns to idle, and a persistently blocked microphone requires browser settings - explain how to unblock access and accurately describe the retry steps.

