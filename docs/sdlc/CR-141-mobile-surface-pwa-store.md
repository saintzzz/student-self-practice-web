# CR-141: Mobile surface - PWA installability + Play Store wrapper

## Driver

PO decision (user, 2026-11-12): evaluated building a native mobile app
to sell teacher features on Google Play - rejected: lesson composing
is desktop work, Play IAP can't issue VAT invoices for B2B, and VN
education incumbents (Azota, Classroom) are free. Ruling: keep web as
the core; add a proper mobile surface cheaply.

Two goals, not one:
- **Kid/parent UX**: installable app feel on phones - most parents and
  many students use phones, not desktops. Offline tolerance matters
  (spotty connections).
- **Trust/marketing**: a Play Store listing ("có app trên store") raises
  credibility during B2B demos with schools/centers. Listing only -
  monetization stays on direct contracts + VAT invoice, never Play IAP.

## Scope

1. **PWA core.**
   - `public/manifest.webmanifest`: name (VieSchool), short_name,
     brand icons (192/512 + maskable), theme/background colors matching
     the dusk/night brand, display: standalone, start_url `/`.
   - `index.html`: manifest link, theme-color meta, apple-touch-icon,
     `apple-mobile-web-app-capable` for iOS standalone.
   - Service worker (Workbox or hand-rolled, whichever bundle size
     favors): app-shell precache; runtime cache for question assets
     (qb_question_assets images, listening MP3s) with bounded size +
     LRU; navigation fallback to index.html for same-origin GETs.

2. **Offline rules (fail-safe, kid-safe).**
   - Practice/exam taking may START only online (auth + assignment RPCs
     are network paths). In-flight results continue to use the existing
     local persist/replay mechanism (CR-98 flush); SW must never serve
     a stale "logged in" shell that lets a different child inherit
     another's state.
   - No offline submission queue beyond the existing replay - the
     server is authoritative (CR-102).

3. **Install + notifications.**
   - `beforeinstallprompt` capture - a quiet "Cài vào màn hình chính"
     affordance on the parent/teacher surfaces (not in the middle of a
     kid's round).
   - Optional phase-2: Web Push for assignment reminders + teacher
     report alerts (requires VAPID keys + consent UX) - scope-marked
     optional, decision at Tech Lead.

4. **Play Store wrapper.**
   - TWA (Bubblewrap) preferred over Capacitor: zero-parallel-codebase,
     asset links verification on vieschool.com, signed upload key held
     outside repo.
   - Listing assets: feature graphic, screenshots (kid-safe content),
     privacy policy URL, content rating (everyone), VN+EN copy.
   - NO Play Billing/IAP wiring - explicitly out of scope.

## Impact assessment

- **Client:** `public/manifest.webmanifest`, `public/icons/*` (image-gen
  pipeline for maskable set), `src/sw.ts` + registration module,
  `index.html` head additions, small install-prompt component. No
  changes to practice/exam logic.
- **Data model:** none. Push opt-in would add one table - only if the
  optional phase is approved.
- **Build:** vite config gains SW emit (vite-plugin-pwa or manual).
  Bundle budget: SW + manifest < 30KB.
- **Risks:** stale-cache bugs are the classic PWA footgun - SW update
  flow (skipWaiting + controllerchange reload toast) must be explicit;
  cache keys must be versioned per deploy. iOS SW quirks (no bfcache
  restore, storage eviction) - verify real device.
- **Store ops:** assetlinks.json hosted at /.well-known/; Play account
  belongs to user - their action at deploy gate.

## Acceptance criteria

- Lighthouse PWA check: installable, offline app shell loads.
- Fresh install on Android shows standalone, correct icon/theme.
- Taking a round online, killing network mid-round: existing flush
  replay still wins; no stale-state cross-account leak.
- TWA build passes Play pre-launch report on a Pixel-class device.

## Estimate

PWA core ~2-3 days + verification pass; TWA wrapper + listing ~1 day
of work after Play account access exists. Push opt-in (optional) +2d.
