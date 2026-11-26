# External Review - Round 255 (codex)

Reviewer: codex (real external run). Scope: commit bc414d6, HEAD=bc414d6.

1. [severity major] src/components/LoopingVideo.tsx:20 - A 60-second autoplay limit still violates WCAG 2.2.2: nonessential motion alongside other content needs pause/stop/hide controls when it exceeds five seconds. `aria-hidden` does not exempt visible motion. - Fix: stop automatically within five seconds or provide an accessible motion control outside decorative containers. citeturn0view0

2. [severity major] src/components/LoopingVideo.tsx:69 - The timeout pauses only once; `syncPlay()` subsequently resumes playback on tab visibility or intersection changes, with no remaining timeout. Reproduced: timeout → switch tabs → return → video plays indefinitely. - Fix: latch a terminal stopped state and guard every `play()` call; also guard `video.ended` so completed one-shot clips stay on their final frame.

3. [severity major] scripts/artgen/run-flow-video.mjs:59 - The 40-character anchor is identical across all five land prompts. Before the new prompt appears in the transcript, `lastIndexOf()` matches the previous request and treats its error as the current failure. Reproduced with the actual playground/town prompts. Returning `fatal: false` then permits another submission while the current render remains pending, restoring asset misattribution. - Fix: correlate errors with a newly submitted request/message ID or a transcript boundary captured before submission; abort on ambiguous attribution.

