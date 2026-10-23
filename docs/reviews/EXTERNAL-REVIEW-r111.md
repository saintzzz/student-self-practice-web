# External Review - Round 111 (codex)

Reviewer: codex (real external run). Scope: commit 49c0cbe, HEAD=49c0cbe.

1. [severity major] src/lib/qb/turnstile.ts:63 - `display:none` permanently hides interactive challenges, including from keyboard and screen-reader users. Guests requiring interaction cannot proceed - use a visible, accessible container; let `appearance: 'interaction-only'` control visibility. [Cloudflare behavior](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/).

2. [severity major] src/lib/qb/turnstile.ts:55 - Challenge execution has no deadline; a stalled script/challenge leaves `inflight` pending indefinitely, so every subsequent guest attempt awaits the same stuck promise - add bounded timeouts and timeout handling, reject on failure, and clean up through `turnstile.remove(widgetId)`.

3. [severity minor] src/lib/qb/bank.ts:104 - Ticket mint failures bypass `bankFetchError`, exposing raw errors such as `turnstile_failed` and `challenge_unavailable` instead of actionable Vietnamese copy - catch and translate failures from both `guestTicket()` calls.

