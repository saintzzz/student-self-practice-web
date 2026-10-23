# CR-108 - Turnstile botnet-grade fetch defense (status: IMPLEMENTED)

Deferred out of CR-103/104. Per-IP caps (0049) stop the single-IP
scrape; a distributed botnet (many IPs each under cap) still drains the
global guest pools. Cloudflare Turnstile is the designed next layer.

## Scope

- Turnstile widget on the guest (unauthenticated) fetch path:
  `fetch_questions_public` requires a `cf-turnstile-response` token;
  server verifies via `https://challenges.cloudflare.com/turnstile/v0/siteverify`
  inside the RPC (or an edge-function gate in front of it).
- Token single-use + short TTL; replay rejected server-side.
- Graceful degradation decision needed: if Turnstile is unreachable,
  fail closed (guest fetch unavailable) vs fail open to existing caps
  (botnet slips through). Recommend fail-closed WITH a clear UX message
  - availability of the free tier is already bounded by caps.
- Authed users exempt or reduced challenge (accounts are uid-capped
  already; friction on paying users has a cost).

## Implementation (done)

- Edge function `practice-turnstile` (verify_jwt=false, CORS allowlist):
  verifies `cf-turnstile-response` via siteverify, then mints a signed
  guest ticket `b64url(v1|ip|exp|nonce).hmac` bound to the caller IP.
- `fetch_questions_public` gained `p_guest_ticket`; anon callers without
  a valid ticket get PT401 `guest_challenge_required`. Authed exempt.
- Secrets in vault: `turnstile_secret` (siteverify), `guest_ticket_secret`
  (HMAC). Edge fn reads both via `practice.get_turnstile_config`
  (service_role-only). Fail closed on missing config.
- Client `src/lib/qb/turnstile.ts`: lazy-loads the widget script,
  `appearance: 'interaction-only'` (invisible unless Cloudflare suspects),
  caches the ticket until ~60 s before expiry, one re-mint retry on PT401.

## Impact assessment

- Client: widget script (async, ~15 kB, lazy-load only when a guest
  hits the fetch path - not in the entry chunk, per CR-105 budget law).
- DB/RPC: signature change on `fetch_questions_public` (token param);
  verify HTTP call-out requires `pg_net` or an edge function - edge
  function preferred (keeps secret server-side, already the pattern).
- Privacy note for review: Turnstile shares visitor metadata with
  Cloudflare - needs a parent-facing line in the privacy page.
