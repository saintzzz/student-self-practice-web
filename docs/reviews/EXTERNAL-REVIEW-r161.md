# External Review - Round 161 (codex)

Reviewer: codex (real external run). Scope: commit df7cd42, HEAD=df7cd42.

1. [severity major] src/games/games/SayItLoud.tsx:39 - Each round focuses a generically labelled mic without announcing the new target word. Screen-reader users hear “Nhấn rồi đọc to lên” without knowing what to say. - Include the target word in the mic’s accessible name or associate the word card using `aria-describedby`.

2. [severity minor] src/games/games/SayItLoud.tsx:223 - Keeping `RoundMic` mounted preserves stale hook phases after scoring: recorder attempts still display “Đang chấm giọng em...”, while browser recognition still shows recording bars and stop instructions beside the verdict. The processing branch also removes the focused button despite the focus-preservation comment. - Render an explicit settled state when feedback exists, and manage focus across processing and completion.

