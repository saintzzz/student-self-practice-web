# CR-141 tech-spec (BA-lite, quick flow)

status: DONE

Re-entry class: CR, quick flow - the CR doc already names components,
data model (none), and stack; no new design language. Designer/Tech
Lead phases folded into this spec per the quick-flow ruling (their
deliverables are the SW strategy + token reuse decisions recorded
below).

## Requirements

### R1 - Installable app shell
GIVEN the app is served over HTTPS at ea.vieschool.com
WHEN a supporting browser evaluates installability
THEN a valid `manifest.webmanifest` is served (name, icons 192/512 +
maskable, `display: standalone`, theme/background matching the night
brand, start_url `/app`, lang `vi`) and a service worker is registered
that satisfies Lighthouse PWA installable checks.

### R2 - Versioned runtime cache
GIVEN the service worker is active
WHEN it fetches same-origin hashed build assets (all of `/assets/` -
every Vite emit there is content-hashed)
THEN they are cached-first (content-hashed URLs are immutable by
construction), with previous-deploy caches deleted on activate.
AND navigation requests are network-first with cached-shell fallback
so a deploy always wins when reachable.
AND public media (`/images/`, `/sfx/`, `/emoji/`, Supabase storage
objects) is stale-while-revalidate inside a bounded FIFO (~150 entries)
so a flaky connection still shows the last-known artwork/audio.
AND no request carrying Authorization/cookie-bearing API traffic
(`/rest/`, `/auth/`, `/rpc/`, POSTs, non-GET) is ever cached -
the server stays authoritative (CR-102) and one child's session data
can never leak into another's cache on a shared device.

### R3 - Explicit update flow
GIVEN a new deploy changes the app
WHEN the waiting service worker exists
THEN the client surfaces a small "Có bản mới - cập nhật" affordance;
activation happens only after user tap OR on the next natural
navigation, via skipWaiting + controllerchange reload.
AND no kid's in-flight round is interrupted: the reload prompt does
not appear while `sessionStorage` marks an active exam/round; it
defers until the round ends.

### R4 - Install affordance on adult surfaces only
GIVEN `beforeinstallprompt` fires
WHEN the user is on a parent/teacher/admin surface (ParentReport,
AdminScreen, parent contact)
THEN a dismissible "Cài app lên màn hình chính" chip may appear.
WHEN the user is on a kid flow (grade select, round, exam, arena)
THEN no install UI is ever shown mid-flow.

### R5 - Store packaging is out of scope for code
The TWA/Bubblewrap wrapper + Play listing are deployment ops, not app
code; this CR ships only the web-side prerequisites (manifest + SW).
assetlinks.json hosting is noted for the deployer phase.

## Decisions recorded (folded TL rulings)

- Hand-rolled `public/sw.js`, no vite-plugin-pwa: the runtime-cache
  strategy needs no precache manifest (hashed assets are immutable),
  keeping the SW ~120 lines, zero new deps, zero bundle cost.
- SW version constant is bumped per deploy by convention; cache names
  embed it (`vieschool-static-v{N}`, `vieschool-media-v{N}`).
- Icons reuse existing brand set (icon-192/512, apple-touch-icon) +
  declare the 512 as two separate icon entries - `purpose:"any"` +
`purpose:"maskable"` - the cleaner pattern for a full-bleed indigo tile.
- Install chip uses existing ui/tokens + a session-dismissed flag
  (`sessionStorage['pwa-install-dismissed']`).
- Ruling (spec amendment, lead-review r1): `start_url`/`scope` are
  `/app`, not `/` - `/` rewrites to the external landing site
  (vieschool-content.vercel.app), so `/app` is the only correct
  installable entry. Spec R1 text updated to match.
- Ruling (lead-review r1): update reload is initiated-only - the
  `controllerchange` reload fires only after the user's explicit
  "Cập nhật" tap; natural SW activation mid-session cannot interrupt
  an in-flight round.
- Ruling (lead-review r2, corrects the r1 premise): prompt gating uses
  a SAFE allowlist (`PROMPT_SAFE_SCREENS` = login/grade-select/credits/
  report/admin), not a kid-flow denylist - every activity screen
  (exam, batch, game, classshow, start-batch, placement, flashcards)
  and every future screen defaults to deferred. The sessionStorage
  `assign-submit:*` scan is NOT a round-active marker (it exists only
  during the post-submit flush window, ExamScreen writes it at finish
  and removes it on server ack); it is kept as a complement covering
  exactly that flush gap, when the screen may already be a safe one.
  `applyUpdate()` also re-checks it as defense in depth.
- Ruling (lead-review r2): SW URL predicates live in
  `public/sw-rules.js` (classic script, loaded via importScripts) so
  unit tests exercise the exact functions the worker runs. Supabase
  media is bounded to `/storage/v1/object/public/` - signed or
  authenticated storage URLs would persist query tokens and are
  excluded. `/fonts/` is in the media allowlist (immutable public
  assets, same risk class as /images/ - recorded here as approved
  scope). Navigate handling is gated to exact `/app` only - deep paths
  have no vercel rewrite and must not receive the shell fallback;
  proxied marketing pages never get the app shell offline fallback.
- Ruling (lead-review r3): all cache.put calls are detached
  (.catch(() => {})) and admit only status 200 or opaque responses -
  a 206 Range put rejection or quota error can never convert a healthy
  fetch into Response.error(). Opaque media (Supabase TTS loaded via
  new Audio() without crossOrigin) is admitted explicitly; bounded by
  MEDIA_MAX. Registration uses updateViaCache:'none' because sw.js
  importScripts('/sw-rules.js'). Shell precache is best-effort.

- Ruling (store packaging): TWA/Bubblewrap is REJECTED for this app -
  Google Play Families policy makes Trusted Web Activities incompatible
  with apps targeting children under 13 (Bubblewrap prints this warning
  on init). Packaging instead: Capacitor 6 WebView shell
  (`com.vieschool.englisharena`, server.url -> ea.vieschool.com/app,
  allowNav restricted to app origin + Supabase), release-signed AAB
  built locally via gradlew bundleRelease. No Play IAP in v1.
  Privacy policy shipped as public/privacy.html at
  ea.vieschool.com/privacy.html.

## Test evidence

- `npx vitest run src/lib/pwa.test.ts` - 17/17 pass (predicates +
  allowlist + flush-window guard).
- `npm run build` - green; dist emits sw.js, sw-rules.js, manifest,
  app.html.
- Playwright smoke on `vite preview` (production build): SW registers
  scope `/` state activated; caches `vieschool-static-v1` +
  `vieschool-media-v1` populate; manifest name/display/start_url `/app`
  verified; offline `/app` served from cache; offline `/guides`
  bypasses the SW (no app-shell leak to proxied pages).
- Lead review r1 REJECT -> r2 REJECT -> r3 REJECT -> r4 APPROVE
  (6 non-blocking minors, all folded in: detached puts, opaque media,
  updateViaCache none, best-effort precache, Screen union typing,
  unconditional media trim, register().catch).

## Estimate
SW + manifest + head tags + registration + install chip + tests:
~1-1.5d. Play Store listing is user-gated ops work, separate.
