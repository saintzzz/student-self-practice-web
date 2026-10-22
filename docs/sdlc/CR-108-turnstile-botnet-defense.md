# CR-108 - Turnstile botnet-grade fetch defense (status: blocked on account)

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

## Blocker

Needs a Cloudflare account + site/secret key pair. Account signup is a
manual human step (not provisionable); keys then go into Supabase Vault
(`turnstile_secret`), never the repo. Until the account exists this CR
cannot implement.

## Impact assessment

- Client: widget script (async, ~15 kB, lazy-load only when a guest
  hits the fetch path - not in the entry chunk, per CR-105 budget law).
- DB/RPC: signature change on `fetch_questions_public` (token param);
  verify HTTP call-out requires `pg_net` or an edge function - edge
  function preferred (keeps secret server-side, already the pattern).
- Privacy note for review: Turnstile shares visitor metadata with
  Cloudflare - needs a parent-facing line in the privacy page.
