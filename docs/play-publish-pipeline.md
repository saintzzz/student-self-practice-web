# Play Store Publish Pipeline

One command publishes English Arena to Google Play once the one-time
console setup is done. Script: `scripts/play-publish.mjs`
(Google Play Developer API v3, zero npm deps - service-account JWT via
`node:crypto`).

```
node scripts/play-publish.mjs check                  # verify auth + app access
node scripts/play-publish.mjs publish                # publish to production
node scripts/play-publish.mjs publish --track=internal   # closed test track
```

A single `publish` run does: open edit -> write vi-VN + en-US listings ->
upload icon/feature graphic/screenshots -> upload AAB -> stage release
on the track -> commit. Atomic: if any step fails the edit is deleted,
nothing half-publishes.

## One-time setup (owner, ~20 min total)

### A. Service account (5 min)

1. <https://console.cloud.google.com> -> create project (or reuse) ->
   enable **Google Play Android Developer API**.
2. APIs & Services -> Credentials -> Create Credentials -> **Service Account**
   (name `play-publish`, no special roles needed in GCP).
3. Service account -> Keys -> Add Key -> JSON -> save the file to
   `~/.config/devin/secrets/play-console-sa.json` (same secrets dir as the
   upload keystore).

### B. Link in Play Console (5 min)

1. Play Console -> **Settings -> API access** -> link the GCP project.
2. **Users and permissions -> Invite new users** -> paste the service
   account email (`...@....iam.gserviceaccount.com`) ->
   **App permissions** -> add `English Arena` -> role **Admin** (or
   "Manage releases" + "Manage store presence").
3. Wait ~15 min for access propagation.

### C. Console-only declarations (once, can't be API'd)

- Create the app shell (name `English Arena`, vi-VN, free).
- Data safety, Content rating questionnaire, Target audience +
  Designed for Families - answers in `docs/play-store-listing.md`.
- After first AAB upload: enroll **Play App Signing** when prompted.

## Recurring releases

```
cd student-self-practice-web
node scripts/play-publish.mjs publish
```

Override paths via env: `PLAY_AAB`, `PLAY_ASSETS`.
Bump `RELEASE_NAME` / `RELEASE_NOTES_VI` in the script per release
(or wire to android versionName later).

## Console automation (when API can't do it)

Some console actions have no API (submitting releases for review, tester
lists, wizard steps). Drive the user's logged-in Chrome via a copied
profile + Playwright persistent context:

1. Quit Chrome fully (graceful quit - tabs restore later).
2. Copy session pieces to a temp profile:
   `Local State`, `Default/Cookies`, `Default/Cookies-journal` ->
   `/tmp/ea-chrome-prof/`.
3. `chromium.launchPersistentContext('/tmp/ea-chrome-prof',
   { channel:'chrome', args:['--disable-blink-features=AutomationControlled'] })`
   - real Chrome binary keeps Keychain access so cookies decrypt.
   - Chrome >= 136 refuses remote debugging on the DEFAULT profile;
     a copied profile dir bypasses that.
   - Google sign-in may still reject automation browsers - the USER
     types the password once in the opened window, session persists
     in the temp profile afterwards.
4. `scripts/console-probe.mjs` is the reusable driver pattern.
   `scripts/console-status.mjs` dumps every setup page;
   `scripts/console-add-testers.mjs <emails...>` appends to the
   alpha testers email list (uses the profile session).

Profile lock: only one Chrome can hold a profile dir - kill stray
instances (`pkill -f ea-chrome-prof`) before relaunching.
