# External Review - Round 256 (codex)

Reviewer: codex (real external run). Scope: commit 8f55c5b, HEAD=8f55c5b.

1. [severity major] src/components/ParentReportScreen.tsx:518 - The only in-app motion control is behind ParentGate’s multiplication challenge, preventing younger children from stopping distracting motion independently; videos still autoplay for 60 seconds. - Fix: expose an ungated, accessible motion toggle on the affected screens.

2. [severity major] src/lib/engagement/ambientMotion.ts:22 - If `localStorage.setItem()` throws, disabling motion neither changes the effective preference nor notifies subscribers, while the checkbox displays “off.” Reproduced with a throwing storage stub. - Fix: update an in-memory preference and notify subscribers regardless of persistence success; render the checkbox from that same store.

3. [severity minor] scripts/artgen/run-flow-video.mjs:55 - The boundary is captured after submission. A rejection rendered before that read is included in the boundary and never detected, causing an eight-minute timeout and abort. Reproduced against the extracted error detector. - Fix: capture a stable message/DOM boundary before clicking and inspect responses belonging to that submission.

