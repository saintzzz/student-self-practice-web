# Technical Architecture - Visual Content Upgrade

- **Project:** student-self-practice-web (brownfield, strangler-fig per discovery-baseline "Strategy ruling")
- **Phase:** Tech Lead (PM -> BA -> Designer -> **Tech Lead** -> Dev -> Tester -> Deployer -> PM)
- **Date:** 2026-09-29. **Revision:** a1.
- **Binding inputs:** `docs/sdlc/prd.md` r3 (89 ACs, BR-01..BR-16, D-1..D-11, A-06 amended, A-09), `docs/sdlc/design-spec.md` d1 (EmojiVisual contract section 3, per-screen spec section 5, open questions section 12), `docs/sdlc/constitution.md` (non-negotiables 1-9, checks C2-C6, C9, SAFE), `docs/sdlc/advisory-log.md`, `docs/sdlc/discovery-baseline.md`, `docs/sdlc/project-plan.md`.
- **Code verified:** `src/types/index.ts`, `src/types/pairMatching.ts`, `src/lib/prng.ts`, `src/lib/practiceSession.ts`, `src/lib/batch/batchSession.ts`, `src/lib/rounds/{types,roundDefinitions,stratifiedSample,round1ExtraLetter,round2ListeningSentence}.ts`, `src/lib/generators/{imageChoice,listeningImageChoice,listeningSentenceFillBlank,extraLetter,countingImage,countingImageDistractors,describeAndChooseImage,picturePairMatching}.ts`, `src/components/{ImageChoiceQuestion,ListeningImageChoiceQuestion,CountingImageQuestion,DescribeAndChooseImageQuestion,PicturePairMatchingQuestion,Mascot,FeedbackPanel,QuestionCard,ActiveRoundQuestion,BatchScreen,GradeSelect,questionCardFixtures}.tsx|ts`, `src/App.tsx`, `src/test/setup.ts`, `src/data/vocabulary/index.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, `.gitignore`, `e2e/utils/{batch-flow,practice-flow}.ts`.
- **External facts verified:** `node_modules/@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm` ships inside the npm package; default runtime fetches WASM from cdn.jsdelivr.net/unpkg unless `setWasmUrl()` is called (dotlottie-web wiki "CSP and WASM Self-Hosting Guide", issue #423, PR #204). npm latest: `@lottiefiles/dotlottie-react@0.19.16` (depends on `@lottiefiles/dotlottie-web@0.80.0`), `sharp@0.35.5`.
- **Artifact language:** English. No em-dash or en-dash characters appear in this file (constitution #8, BR-14).

Precedence: PRD r3 wins over this document; design-spec d1 wins over this document on presentation details unless an ADR records a `Ruling:` change. Every decision cites its driver (AC / BR / DS / ruling / code fact).

---

## 1. System overview

Single-page React 18 + Vite 5 + TypeScript app, no backend, Vercel static. This feature adds a render layer below the question components:

```
                                    maintainer machine (scripts/, node only)
  +-----------------------------+   +----------------------------------------------------+
  | ALL_WORDS (326 VocabWords)  |   | fetch-emoji-assets.mjs  -> public/emoji/{svg,lottie}|
  |  (id, emoji, imageUrl?, ..) |   |   + src/lib/emoji/lottieKeys.generated.json          |
  +--------------+--------------+   | fetch-vocab-images.mjs  -> image-staging/ (git-ignored)
                 |                  | publish-vocab-images.mjs-> public/images/vocab/ +   |
                 v                  |   public/attribution.json images[]                  |
  src/lib/emoji/wordVisual.ts       | check-attribution.mjs   -> C3 bidirectional gate    |
  (Map wordId->{emoji,imageUrl?})   | check-bundle-budget.mjs -> AC-2.10 entry budget     |
                 |                  +----------------------------------------------------+
                 v
  Question payloads (additive wordId / optionWordIds / promptWordId)
                 |
                 v
  +-------------------------------------------------------------+
  | EmojiVisual (single render path, BR-01)                      |
  |   props: emoji, count, animated, imageUrl, variant,          |
  |          loading, onImageError, className                    |
  |   state machine: image -> lottie -> svg -> native (BR-04)    |
  |   hidden text layer: one sr-only span = emoji.repeat(count)  |
  |   lottie path -> React.lazy -> EmojiLottiePlayer chunk       |
  |       -> setWasmUrl(?url) -> DotLottieReact                  |
  +-------------------------------------------------------------+
                 ^
  render sites: ImageChoice prompt, ListeningImageChoice options,
  Counting prompt/options, Describe options, pair-matching picture
  tiles, Mascot (pig + accents), FeedbackPanel picture (new)
```

Same-origin rule (constitution #4, A-05, BR-07): at runtime the app requests only its own origin: `emoji/svg/*.svg`, `emoji/lottie/*.json`, `images/vocab/*.webp`, `attribution.json`, and the emitted WASM asset. The dotLottie player and its WASM are emitted into `dist/` by `vite build`; nothing is fetched from a third-party origin.

---

## 2. Architecture Decision Records

Each ADR: Context / Options / Decision / Consequences / Constitution impact.

### ADR-1: EmojiVisual as the single render path, with an explicit render-mode state machine

**Context.** BR-01 requires one shared component for every emoji picture (the F-1 sites plus the new FeedbackPanel picture). BR-04 fixes the fallback chain `image -> lottie -> svg -> native`; BR-03 gates animation; design-spec 3.3 fixes the exact state machine. Component-internal state is required because the fallback transitions depend on DOM error events and a media query change.

**Options.**
- A. Per-site logic kept in each component, sharing a small `<img>` helper. Rejected: six divergent fallback implementations, no single point for the text-layer contract (A-04 B) or `data-emoji-mode` hooks (PRD section 6 conventions).
- B. One `EmojiVisual` component owning the full state machine; call sites only supply `emoji`, `count`, `animated`, `imageUrl`, `variant`, `loading`, `onImageError`, `className` (design-spec 3.1).
- C. `EmojiVisual` plus a React Context that forces a mode per subtree. Rejected: adds a second control path for a need that does not exist; grid contexts are already forced static by `count > 1` and default `animated={false}`.

**Decision: B**, exactly per design-spec section 3. The mode state machine lives in `src/lib/emoji/renderMode.ts` as pure functions so it is unit-testable without jsdom DOM events:

```ts
export type EmojiRenderMode = 'image' | 'lottie' | 'svg' | 'native';

export interface EmojiModeInput {
  emoji: string;
  count: number;            // >= 1
  animated: boolean;
  imageUrl?: string;
  prefersReducedMotion: boolean;
  lottieDisabledForSession: boolean;  // ADR-6 circuit breaker
  hasLottie: (key: string) => boolean;
}

export function initialMode(input: EmojiModeInput): EmojiRenderMode;
export function modeAfterImageError(input: EmojiModeInput): Exclude<EmojiRenderMode, 'image'>;
```

- `initialMode`: `image` iff `imageUrl && count === 1`; else `lottie` iff `animated && count === 1 && hasLottie(key) && !prefersReducedMotion && !lottieDisabledForSession`; else `svg`. `native` is never an initial mode.
- Transitions (one-way, per design-spec 3.3): `image` on photo `error` -> `lottie`/`svg` plus fire `onImageError` once; `lottie` on player failure or 2500 ms without a first frame -> `svg`; `lottie` on `prefers-reduced-motion` change to `reduce` -> `svg`; `svg` on first img `error` -> `native`; `native` terminal. `data-emoji-mode` always reflects current mode; `data-emoji-ready="true"` is set once the visible layer reports ready (photo/svg `load`, first Lottie frame, `native` at mount).
- `count > 1` hard-forces `svg` (or `native` on error): it never enters `image` or `lottie` regardless of props (defensive BR-03/BR-09 enforcement in one place, AC-1.2, AC-2.3, AC-5.5).
- Sizing: the picture box is always `1em x 1em` of the container font-size; EmojiVisual never sets a font-size (design-spec 3.1/3.5, AC-1.8, AC-10.2). `variant="inline"` uses `relative inline-block h-[1em] w-[1em] align-[-0.125em] leading-none`; `variant="block"` uses `relative mx-auto flex h-[1em] w-[1em] items-center justify-center leading-none`; `count > 1` renders `relative inline` with N imgs at `inline-block h-[1em] w-[1em] mx-[0.05em] align-[-0.125em]` so repeated pictures wrap like glyphs.
- Lottie loading state (DS-1 ruling B): in `lottie` mode the SVG poster renders immediately; the dotLottie canvas mounts in an `absolute inset-0 opacity-0` aria-hidden wrapper that crossfades to `opacity-100` (`transition-opacity duration-150`) on the first frame, after which the poster unmounts. No skeleton, no layout shift (same 1em box).
- The lazy player is wrapped in `EmojiVisualErrorBoundary` (ADR-6) so a chunk-import rejection becomes a mode transition instead of an unhandled error.

**Consequences.** Every BR-01 site converges to one code path; all fallback behavior is tested once in `EmojiVisual.test.tsx` plus pure tests of `renderMode.ts`. The 2500 ms timeout constant lives in `src/lib/emoji/lottieRuntime.ts` (`LOTTIE_READY_TIMEOUT_MS = 2500`), giving 500 ms margin under the AC-2.8 bound of 3000 ms.

**Constitution impact.** Satisfies C2 (single render path keeps the text layer), #5 (animation only in single-image contexts, enforced by `count`/eligibility), #6 (reduced-motion check inside the state machine, C6), #4 (all URLs same-origin per ADR-3).

### ADR-2: Hidden sr-only text layer as the DOM-text contract carrier

**Context.** Constitution #2 and advisory A-04: existing tests assert emoji characters in the DOM (`getByText('🐱')`, `toHaveTextContent('🐱🐱🐱')`, e2e `innerText` reads). Ruling A-04 B fixes the mechanism: `<img aria-hidden>` + sr-only text span. Design-spec 3.4 makes the exact DOM normative, including the forbidden hiding techniques (no `display:none`, `visibility:hidden`, `opacity:0`, `hidden`, `width:0/height:0`, or `clip-path`) so Playwright `toBeVisible` and jest-dom `toBeVisible` keep passing (AC-1.3, RK-3).

**Options.**
- A. `alt` text on the img instead of a text node. Rejected by A-04: breaks `textContent`-based assertions.
- B. Tailwind `sr-only` span holding `emoji.repeat(count)` as a single text node, in every mode; the same element (same React key) swaps `sr-only` for `inline-block leading-none` in `native` mode so the DOM node survives the transition.

**Decision: B** per A-04 B and design-spec 3.4. The text layer contains only emoji characters (no ASCII), which keeps `extractRevealedWord` (e2e `practice-flow.ts:159-168`) correct after the FeedbackPanel picture lands (F-15, AC-10.4). EmojiVisual sets `position: relative` on the root so the sr-only child is anchored.

**Consequences.** `toHaveTextContent` on option buttons still reads the emoji; `getByText` resolves the sr-only span; pair tiles' accessible name stays the emoji (design-spec 7.4). No test file outside the section 6.0 allowlist needs an edit.

**Constitution impact.** Direct implementation of #2 and the accessibility half of #1.

### ADR-3: Emoji key derivation and asset URL scheme

**Context.** BR-06: one key per emoji = the Twemoji file name. Assets live at `public/emoji/svg/{key}.svg` and `public/emoji/lottie/{key}.json` (A-07). Design-spec 3.2 fixes the rule: lowercase hex code points joined by `-`; if the sequence contains no U+200D, strip every U+FE0F; if it contains a ZWJ, keep FE0F.

**Options.**
- A. Hardcode a `Map<emoji, key>` generated at maintainer time. Rejected: a second table that can silently drift from the algorithm; the rule is 20 lines of pure code.
- B. Compute the key at render time with a pure function `toEmojiKey(emoji)` implementing the Twemoji rule; the maintainer script uses the same function (shared module importable from both `src` and `scripts`).

**Decision: B.** `src/lib/emoji/emojiKey.ts` exports `toEmojiKey(emoji: string): string`. Implementation: iterate `[...emoji].map(ch => ch.codePointAt(0)!.toString(16))`; if no code point equals `200d`, drop every `fe0f`; join with `-`. Verified against design-spec examples: 🐱 `1f431`, 🐿️ `1f43f`, ✈️ `2708`, 1️⃣ `31-20e3`, 🔟 `1f51f`, 🧑‍⚕️ `1f9d1-200d-2695-fe0f`, 🧑‍🍳 `1f9d1-200d-1f373`. URLs: `src/lib/emoji/emojiAssets.ts` exports `svgUrl(key)`, `lottieUrl(key)` built on `${import.meta.env.BASE_URL}emoji/...` so a non-root `base` stays same-origin. Scripts import `toEmojiKey` via the plain-TS file (no `.ts` extension pitfalls: `fetch-emoji-assets.mjs` keeps a duplicate-free copy by importing the compiled rule? No: scripts cannot import TS. The rule is duplicated in `scripts/lib/emojiKey.mjs`, ~20 lines, and a unit test asserts `toEmojiKey` equals the `.mjs` implementation's behavior over every bank emoji plus the design-spec examples - the cheapest bidirectional drift guard).

**Consequences.** Single source of truth for runtime keys; the script-side duplicate is pinned by a unit test (AC-1.6 already fails the build on a missing SVG).

**Constitution impact.** #4 same-origin (BASE_URL-relative URLs), C3 (paths exactly the three allowed directories).

### ADR-4: `hasLottie` backed by a generated JSON key set

**Context.** BR-03 requires knowing, without a network probe (AC-2.2), whether a Noto animation exists for a key. Design-spec 3.2 estimates ~130 keys. Open question from designer: file format.

**Options.**
- A. `lottieKeys.generated.ts` exporting `new Set([...])`. Works, but scripts must parse TS to drift-check it.
- B. `src/lib/emoji/lottieKeys.generated.json` (sorted array of keys) imported via `resolveJsonModule` (already enabled in tsconfig.json), wrapped by `emojiAssets.ts` as `const LOTTIE_KEYS: ReadonlySet<string> = new Set(keys)`.
- C. Existence probe via `fetch`/`<link>` at runtime. Rejected by AC-2.2 (no probing request) and by AC-2.5 (no lottie request before a player mounts).

**Decision: B.** The file is written by `scripts/fetch-emoji-assets.mjs` (deterministic: dedupe + sort ascending + trailing newline, generated-file header comment in the sibling README comment inside the script). `hasLottie(key: string): boolean` = `LOTTIE_KEYS.has(key)`. Drift is checked both ways by `scripts/check-attribution.mjs`: every key in the JSON must have `public/emoji/lottie/{key}.json` and vice versa (extension of C3: the generated manifest is part of the inventory contract). Estimated entry cost ~1-2 kB raw, well inside the +10.04 kB JS budget (AC-2.10).

**Consequences.** `hasLottie` answers in O(1) with zero I/O; the JSON format lets any `.mjs` script validate it without a TS parser.

**Constitution impact.** C3 (bidirectional inventory), #5 (no probing traffic).

### ADR-5: `imageUrl` population - hand-maintained field on `VocabWord` (resolves D-8)

**Context.** D-8 delegates to Tech Lead: how `imageUrl` gets onto `VocabWord`. PRD 9.1 declares `imageUrl?: string` on the type; AC-4.9 requires a bidirectional fitness check (every `imageUrl` points to an existing file with exactly one approved record; no orphans). BR-12 forbids scripts from writing `reviewStatus: "approved"`.

**Options.**
- A. Hand-maintained `imageUrl` on `VocabWord` entries. The curator approves a photo; the maintainer adds `imageUrl: '/images/vocab/{id}.webp'` to the word's entry in the same commit that runs the publish script. `getWordVisual` reads the field directly from the once-built `ALL_WORDS` map.
- B. Generated module: publish script writes `src/data/vocabulary/vocabImages.generated.ts` (`wordId -> path`); `wordVisual` merges it over `ALL_WORDS`. Atomic publish, single writer, but introduces a second source of truth for a field PRD 9.1 already declares on `VocabWord`, and divorces the field from the word entry it describes.
- C. Publish script rewrites the vocabulary `.ts` files programmatically. Rejected: the files are hand-authored with comments; a code rewriter is fragile and reviews poorly.

**Decision: A.** Rationale: approval is already a manual act (BR-12 requires a human to set `reviewStatus`, `reviewedBy`, `reviewedAt`); adding one field in the same commit is one more reviewed line, keeps PRD 9.1's contract literal (the data lives on `VocabWord`), and keeps `wordVisual` a trivial read. Toil is bounded: `publish-vocab-images.mjs` prints, for each newly published word, the exact line `imageUrl: '/images/vocab/{id}.webp',` to paste, and the fitness test fails the build if the field is missing or wrong, so the manual step cannot silently drift. Determinism: a reviewed field edit is a deterministic input; drift coverage: `imageBank.test.ts` (AC-4.9) asserts `word.imageUrl -> existing file -> exactly one approved attribution record`, and `check-attribution.mjs` asserts `file <-> record` both ways plus "no record references a wordId absent from ALL_WORDS".

`getWordVisual` contract (AC-5.9): `src/lib/emoji/wordVisual.ts` builds `const WORD_VISUALS = new Map(ALL_WORDS.map(w => [w.id, { emoji: w.emoji, imageUrl: w.imageUrl }]))` once at module load and exports `getWordVisual(wordId: string): { emoji: string; imageUrl?: string } | undefined` (undefined for unknown ids, so fixture tests using non-bank ids get no picture - see ADR-12). The returned `imageUrl` is base-prefixed: `import.meta.env.BASE_URL === '/' ? word.imageUrl : BASE_URL + word.imageUrl.replace(/^\//, '')` keeps the stored field's canonical `/images/vocab/...` form while staying same-origin under a non-root base.

**Consequences.** No generator change is needed for `imageUrl` (payloads carry `wordId`; resolution happens at render per BR-05). The only manual step per approved photo is documented in the curator runbook (section 5.4) and enforced by the fitness test.

**Constitution impact.** SAFE (field only populated after human approval), C3 + AC-4.9 (drift-tested), #3.

### ADR-6: Lottie runtime - pinned dotLottie, lazy boundary, self-hosted WASM via `?url`, session circuit breaker

**Context.** DEP-1 mandates `@lottiefiles/dotlottie-react`. F-5 + external verification: the package does NOT bundle the WASM renderer into JS; the runtime downloads `dotlottie-player.wasm` (~500 KB compressed) from cdn.jsdelivr.net (unpkg fallback) unless `setWasmUrl()` is called before the first player mounts - that default violates constitution #4 / BR-07 / AC-2.6. The WASM file IS shipped inside `node_modules/@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm` (verified: `@lottiefiles/dotlottie-react@0.19.16` depends on `@lottiefiles/dotlottie-web@0.80.0`; the self-hosting wiki documents the `?url` import path). AC-2.5 additionally requires the entry chunk to contain no `dotlottie` string and to issue no player/WASM/JSON request before the first lottie mount. A-09 caps players: <= 1 per screen before answering, <= 2 after.

**Options for WASM self-hosting.**
- A. Copy the wasm into `public/vendor/dotlottie-player.wasm` via a script, call `setWasmUrl('/vendor/dotlottie-player.wasm')`. Works, but the committed binary can drift from the installed package version on upgrades (wasm/JS version mismatch is a documented failure mode), and adds a second committed binary to maintain.
- B. `import wasmUrl from '@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm?url'` inside the lazy chunk, then `setWasmUrl(wasmUrl)` at module top-level. Vite emits the wasm into `dist/assets/` with a content hash, version-locked to the installed package (impossible to drift), zero scripts, URL resolved only when the lazy chunk loads.
- C. Let the runtime fetch from CDN. Rejected outright by constitution #4 / AC-2.6.

**Decision: B**, with A documented as the contingency if `?url` on `.wasm` misbehaves under the pinned Vite 5.4 line (the fallback is a committed `public/vendor/dotlottie-player.wasm` plus a `postinstall`-free manual copy step in the runbook; the change is confined to `EmojiLottiePlayer.tsx`). TS typing: `src/vite-env.d.ts` already references `vite/client`; add a defensive declaration `declare module '*.wasm?url' { const src: string; export default src; }` in `src/types/assets.d.ts` so `tsc -b` never depends on vite/client covering this query.

**Player boundary design** (`src/components/EmojiLottiePlayer.tsx`, the lazy chunk):
- Top-level: `import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react'` and `import wasmUrl from '@lottiefiles/dotlottie-web/dist/dotlottie-player.wasm?url'`; call `setWasmUrl(wasmUrl)` in module scope (runs exactly once when the chunk first executes, before any player mounts - BR-07, AC-2.5, AC-2.6).
- The wrapper fetches the animation JSON itself (`fetch(lottieUrl)`), then passes the parsed object via the `data` prop (not `src`). This makes the DS-9 distinction implementable: a non-OK or network-failed JSON fetch is a per-asset failure (fallback this mount only), while a player runtime error after valid data (WASM/init/render failure, surfaced via the DotLottie `loadError`/error event on the ref callback) is a player-level failure. `AbortController` cancels on unmount.
- Props: `{ lottieKey: string; onReady(): void; onError(kind: 'data' | 'runtime'): void }`. `onReady` fires on the player's first rendered frame (`render`/`frame` event, with `load`+`requestAnimationFrame` as the documented fallback during implementation); the canvas wrapper is `aria-hidden` and `pointer-events-none` (design-spec 6.2). Autoplay + loop (DS-2 ruling A, AC-2.1); device pixel ratio capped at 2.

**Session circuit breaker (DS-9, confirmed)** in `src/lib/emoji/lottieRuntime.ts`:

```ts
let lottieDisabledForSession = false;
let lottieEverReady = false;
export function isLottieDisabledForSession(): boolean;
export function disableLottieForSession(): void;
export function markLottieReady(): void;          // called on first successful frame, session-wide
export function hasLottieEverRendered(): boolean;
export const LOTTIE_READY_TIMEOUT_MS = 2500;
```

Breaker trips (and every later `initialMode` resolves `svg`) on exactly: (a) lazy chunk `import()` rejection caught by `EmojiVisualErrorBoundary`; (b) `onError('runtime')` from the player; (c) a 2500 ms ready-timeout on a mount while `hasLottieEverRendered()` is still `false` (a session that has never produced a frame almost certainly has a broken WASM/player path - this is the practical form of "WASM load error" when the failure hangs instead of erroring). A timeout AFTER at least one successful frame, and any `onError('data')` (single JSON 404/network blip), fall back that mount only and never trip the breaker - the literal DS-9 carve-out. Module-scope state is the right lifetime: "session" = page lifetime; no persistence, no React dependency.

**Lazy boundary and preload-safety.** `EmojiVisual.tsx` declares `const LazyEmojiLottiePlayer = React.lazy(() => import('./EmojiLottiePlayer'))` and renders it inside `<EmojiVisualErrorBoundary onError={...}><Suspense fallback={poster}>`. Since `dotlottie-web` is imported by no other module, Rollup keeps it inside the `EmojiLottiePlayer-[hash].js` chunk; the entry chunk then contains no `dotlottie` string (AC-2.5). Risk: if Vite's dynamic-import preload map or an emitted shared chunk leaks the name into the entry, fix once in `vite.config.ts` with `build.rollupOptions.output.chunkFileNames`/`sanitizeFileName` renaming `*dotlottie*` to `lottie-*`; the AC-2.5 grep test makes the leak impossible to ship silently.

**Player cap (A-09, AC-2.9).** Enforced by construction, not by counting at runtime: `animated` is passed at exactly three call sites (ImageChoice prompt, FeedbackPanel picture, Mascot accent - design-spec 3.6). At most one animated EmojiVisual exists per screen before answering (prompt only); after answering, prompt-or-feedback-picture + the ✨ accent = 2. C5 grep verifies `animated` appears only in `ImageChoiceQuestion.tsx`, `FeedbackPanel.tsx`, `Mascot.tsx`.

**Consequences.** Runtime is fully same-origin (BR-07), player weight is deferred (NFR-1 lazy-player line), failure modes degrade to the committed SVG instead of looping retries. The `data` (not `src`) fetch slightly increases wrapper code (~30 lines) in exchange for the exact DS-9 semantics.

**Constitution impact.** #4 (C4: zero third-party requests, wasm from own origin), #5 (C5: lazy + caps), #6 (C6: reduced motion never reaches the player code path).

### ADR-7: Emoji assets in `public/`, enumerated at maintainer time, never statically imported

**Context.** Needed emoji set = distinct `emoji` values over `ALL_WORDS` + mascot literals `🐷`, `✨`, `🎉` (AC-1.6; today ~279 distinct + 3). Options were (a) static `import` of SVGs (would land in `src/assets` or `dist/assets`, violating A-07 and complicating C3), vs (b) `public/emoji/svg/{key}.svg` copied verbatim to `dist/`.

**Decision: B** - `public/` only (A-07 already forbids `src/assets`; this ADR records the reason end-to-end). Consequences: `import.meta.env.BASE_URL`-relative URLs (ADR-3), one request per distinct emoji per page load with browser caching (NFR-1 concurrency line), per-asset caps SVG <= 20 KB / Lottie JSON <= 120 KB enforced by `fetch-emoji-assets.mjs` (larger files skipped and reported, AC-4.12). `public/` growth ~6-9 MB accepted (RK-5). No Vite config change is needed: `publicDir` defaults handle it.

**Constitution impact.** C3, A-07, #4; determinism (committed files, `npm run build` makes no network fetch - AC-4.10).

### ADR-8: Additive word-identity payload fields and generator updates

**Context.** A-06 amended + BR-05: photo resolution needs word identity in payloads (emoji are not globally unique, F-8). PRD 9.1 fixes the exact additive fields. Generators must populate them without altering any pre-existing field content (AC-5.8), and image-choice distractors gain the BR-15 same-emoji exclusion (AC-9.3).

**Decision.** Type diffs (all additive, all required - fixtures updated under T-3):

```ts
// src/types/index.ts
interface VocabWord              { /* ...existing */ imageUrl?: string; }
interface ImageChoiceQuestion    { /* ...existing */ wordId: string; }
interface ListeningImageChoiceQuestion { /* ...existing */ optionWordIds: readonly [string, string, string, string]; }
interface ExtraLetterQuestion    { /* ...existing */ wordId: string; }
interface ListeningSentenceFillBlankQuestion { /* ...existing */ wordId: string; }
interface DescribeAndChooseImageQuestion { /* ...existing */ optionWordIds: readonly [string, string, string, string]; }
interface CountingImageQuestion  { /* ...existing */ promptWordId: string; }
// src/types/pairMatching.ts
interface PairMatchingPair       { word: string; emoji: string; wordId: string; }
```

Unchanged types: `CountingImageOption`, `PairMatchingTile`, `PronunciationRecordingQuestion`, `ListeningFillBlankQuestion`, `PicturePairMatchingQuestion.tiles`.

Generator changes (minimal-diff, all field content preserved):

| Generator | Change |
|-----------|--------|
| `imageChoice.ts` | Emit `wordId: word.id`. BR-15 fix: candidate pool for `pickDistinct` becomes `topicWords.filter(w => w.emoji !== word.emoji)`; `keyOf`/`excludeKeys` unchanged. Only questions whose old candidate set contained a same-emoji word can change output (exactly the 4 F-8 shared emoji: 😢 cry/sad, 🏊 swim/swimming, 😴 sleep/tired, 📖 book/read). |
| `listeningImageChoice.ts` | Track `candidateWords = [word, ...distractors]`; emit `optionWordIds = order.map(i => candidateWords[i]!.id)` parallel to `options`. |
| `extraLetter.ts` | Emit `wordId: word.id`. |
| `listeningSentenceFillBlank.ts` | Emit `wordId: word.id`. (Sentence content changes only per ADR-10.) |
| `countingImage.ts` | Emit `promptWordId: word.id` (prompt is always built from the target word, both directions). No `optionWordIds` (US-10 uses `promptWordId`). |
| `countingImageDistractors.ts` | `buildDistractorOptions` returns `{ options: [o1, o2, o3], wordIds: [id1, id2, id3] }` (source word id per distractor: correct-word id for the same-object option, picked word ids for the other two). Internal signature change; both callers updated. Option contents byte-identical. |
| `describeAndChooseImage.ts` | Track source word ids through `order.map` exactly as `options` is built (count instances: pool words `[word, word, wRC, wWC]`; negation: `[differentWord, word, word, word]`); emit `optionWordIds` parallel to `options`. |
| `picturePairMatching.ts` | `toPair` adds `wordId: word.id`. |

**AC-5.8 interpretation (recorded, traceable):** "pre-existing fields unchanged versus ebd58a5" applies modulo the two deliberate spec'd deltas - BR-15 distractor exclusion (AC-9.3, affects only the F-8 shared-emoji targets) and the US-11 sentence classes (ADR-10, affects only the 71 listed words). Every other generated field is byte-identical; the snapshot test (ADR-10) and a `pickDistinct` invariance check prove it mechanically. This reading is forced: AC-9.3 and AC-11.x literally require those fields to change; flagging rather than silently widening scope.

**Fixture backward compat (T-3).** New required fields are added to `questionCardFixtures.ts` and inline fixtures with non-bank ids (e.g. `wordId: 'fixture-cat'`) so `getWordVisual` returns `undefined` and no FeedbackPanel picture appears - existing assertion lines then stay identical (AC-10.6 preserved inside tests). Real-bank fixtures in new T-4 tests exercise the picture path.

**Consequences.** `getCorrectWord` and all scorers in `practiceSession.ts` are untouched (fields are additive). The `(topicId, emoji)` failure mode from the original A-06 is structurally impossible: components resolve `wordId -> imageUrl` only through `getWordVisual` (AC-5.6 code check).

**Constitution impact.** #2/#7 (additive only, no test-shape breakage beyond T-3), fault catalog (BR-15 removes the double-correct-answer fault).

### ADR-9: Round 1 pool - `buildRound1Questions` mixes 7 extra-letter + 3 image-choice (D-10 A)

**Context.** US-9 + ruling D-10 A: `image-choice` joins live Round 1, shuffled, not blocked. F-2 confirms routing (`QuestionCard`) and scoring (`submitOptionAnswer`) already handle the kind; `batchSession.ts:102` already calls `definition.buildQuestions(seed)`.

**Decision.** Follow the `buildRound2Questions` pattern exactly (`round2ListeningSentence.ts:39-52`):

```ts
// src/lib/rounds/round1ExtraLetter.ts
export const ROUND_1_QUESTION_COUNT = 10;              // unchanged
export const ROUND_1_EXTRA_LETTER_COUNT = 7;           // new
export const ROUND_1_IMAGE_CHOICE_COUNT = 3;           // new
export type Round1Question = ExtraLetterQuestion | ImageChoiceQuestion;

export function buildRound1Questions(seed: string): Round1Question[] {
  const extraLetterPool = generateExtraLetterQuestions([...ALL_WORDS]);
  const imageChoicePool = generateImageChoiceQuestions([...ALL_WORDS]);
  const extraLetter = stratifiedSample(extraLetterPool, ROUND_1_EXTRA_LETTER_COUNT, `round1-${seed}`);
  const imageChoice = stratifiedSample(imageChoicePool, ROUND_1_IMAGE_CHOICE_COUNT, `round1-imgchoice-${seed}`);
  const combined: Round1Question[] = [...extraLetter, ...imageChoice];
  return seededShuffleIndices(combined.length, `round1-mix-${seed}`).map((i) => combined[i]!);
}
```

`RoundContentDefinition.buildQuestions` already returns `Question[]`; `Round1Question[]` is assignable - no type, batch, timer, routing, or scoring change. Round 1 `roundType: 'extra-letter'` and title `Vòng 1: Bắn chữ cái thừa` stay (D-10 ruling text). Determinism comes free from `seededShuffleIndices`/`stratifiedSample` (AC-9.1: same seed -> same 10 questions; seeds s1-s40 show image-choice at varying positions including position 1 - s1..s20 never produce index 0, see PRD amendment A-12). `stratifiedSample` keys on each question's `topicId`, so each slice stays topic-balanced (AC-9.2). Image-choice distractors draw from `ALL_WORDS`, which is why the thin `g2-places` topic (3 words) no longer blocks generation (PRD D-5 note, F-14 consequence); the per-question `topicId` is the target word's topic.

**Consequences.** T-5 allowlisted churn on position-assuming tests (risk register R-4). Pool build cost: ~326 words x 3 variants ~= 980 image-choice questions + extra-letter pool per Round build - a few ms of pure computation; acceptable at Batch start.

**Constitution impact.** #7 (seeded determinism preserved; allowlist T-1/T-5 governs test edits).

### ADR-10: Topic-aware sentence classes in `listeningSentenceFillBlank.ts` (D-6, BR-16)

**Context.** F-9 documents the current two-class + actions-template generator. US-11/BR-16 add topic/word-class template families and a fixed precedence chain, with a hard byte-identical guarantee for the 212 unchanged baseline words (AC-11.5) and an exact 71-word changed set (AC-11.6).

**Decision.** Refactor `templatesForWord` into `sentenceClassFor(word: VocabWord): SentenceClass`:

```ts
type SentenceClass = 'countable' | 'mass' | 'action' | 'feeling' | 'occupation'
                   | 'family' | 'body-part' | 'color' | 'number' | 'the-noun' | 'sport';

const WORD_ID_OVERRIDES: Readonly<Record<string, SentenceClass>> = {
  chef: 'occupation', moon: 'the-noun', ocean: 'the-noun', fire: 'the-noun', skateboard: 'countable',
};
const TOPIC_CLASSES: Readonly<Record<string, SentenceClass>> = {
  'g2-feelings': 'feeling', 'g2-occupations': 'occupation', 'g2-family': 'family',
  'g2-body-parts': 'body-part', 'g2-colors': 'color', 'g2-numbers': 'number',
  'g2-weather': 'the-noun', 'g2-sports': 'sport',
};
// precedence: WORD_ID_OVERRIDES -> 'g2-actions' => action -> TOPIC_CLASSES -> countable ? countable : mass
```

Template sets copied verbatim from PRD 5.1 (`{a}` = existing `article(word)`); `countable`, `mass`, `action` keep today's exact template functions so unchanged classes produce byte-identical output. The generator emits `wordId` (ADR-8) and otherwise only swaps which template array applies.

**Byte-identical guarantee mechanism (AC-11.5/AC-11.6).** A committed baseline fixture `src/lib/generators/listeningSentenceFillBlank.baseline.json` maps each of the 283 baseline `wordId`s to its `[id, sentence, displaySentence]` triples produced by the generator at commit `ebd58a5`. Production procedure (documented for Dev): `git show ebd58a5:src/lib/generators/listeningSentenceFillBlank.ts` plus the baseline vocab, run once via a scratch script (`scripts/dump-sentence-baseline.mjs`, kept in-repo for reproducibility), commit the JSON. The snapshot test regenerates for the same 283 ids and asserts: (a) every word not in the PRD 5.1 71-word list is byte-identical; (b) the changed set equals the 71-word list exactly. The 71-word list is encoded as a `const` in the test file, transcribed from PRD 5.1.

**Consequences.** `listeningSentenceFillBlank.test.ts` (fixture topicIds `t-animals`, `t-colors`, `ACTIONS_TOPIC_ID`) passes unchanged (AC-11.8) because none of those ids hit the new tables. Accepted residuals recorded per PRD 5.1 ("I can count to one.", "I can see the wind.").

**Constitution impact.** #7 (snapshot guard), NFR-11, fault catalog "câu hỏi vô lý".

### ADR-11: Maintainer-side asset pipeline scripts

**Context.** US-4 fixes five script contracts; constitution C3/SAFE fix their invariants. All scripts are Node `.mjs` run by a maintainer, never at build time (BR-07: `npm run build` performs no network fetch; generated assets are committed). `image-staging/` is added to `.gitignore` (PRD US-4 note: staging outside `public/`).

**Decision - files and contracts.**

| Script (npm run) | File | Behavior |
|------------------|------|----------|
| `assets:emoji` | `scripts/fetch-emoji-assets.mjs` | Enumerate distinct keys via `toEmojiKey` over `ALL_WORDS` + `🐷✨🎉`. Fetch Twemoji SVG per key from pinned `https://cdn.jsdelivr.net/gh/jdecked/twemoji@<PIN>/assets/svg/{key}.svg` (PIN recorded in `attribution.json` collection `version`). Fetch Noto index `https://googlefonts.github.io/noto-emoji-animation/data/api.json`, normalize each entry's codepoints to the Twemoji key rule, fetch `https://fonts.gstatic.com/s/e/notoemoji/latest/{noto_key}/lottie.json` for intersecting keys, write `public/emoji/lottie/{key}.json` (skip + report files > 120 KB, AC-4.12). Write `lottieKeys.generated.json` sorted. Print emoji lacking a Noto animation. Idempotent: existing files skipped unless `--force`. |
| `assets:images` | `scripts/fetch-vocab-images.mjs` | Per VocabWord (or `--word`): GET `https://api.openverse.org/v1/images/` with `q=<word>`, `license=cc0,by`, `page_size<=20`, identifying `User-Agent`, no `unstable__include_sensitive_results`, no key (AC-4.1). Discard non-cc0/by and `by`-with-empty-creator results, count `rejected-license` (AC-4.2). Download first acceptable candidate bytes; normalize via `sharp` (resize to fit 512 px, `.webp({quality})` stepped down until <= 80 KB, strip all metadata - AC-4.4). Write `image-staging/{wordId}.webp` + append `image-staging/candidates.json` record with `reviewStatus:'pending'`, `reviewedBy/reviewedAt: null` (AC-4.3). TASL fields from the Openverse result; titles/creators sanitized (U+2013/U+2014 -> `-`, control chars stripped - AC-4.8). Rate discipline: >= 3 s between requests, honor `Retry-After`/`X-RateLimit-*` at 0, hard cap 20 req/min; resume by skipping wordIds already in `candidates.json` (AC-4.6). Refresh `docs/image-bank-coverage.md` + console totals (AC-4.7). |
| `assets:images:publish` | `scripts/publish-vocab-images.mjs` | Read `candidates.json`; only records with `reviewStatus==='approved'` AND non-empty `reviewedBy`/`reviewedAt` are copied to `public/images/vocab/{wordId}.webp` and appended (sorted by `wordId`) to `public/attribution.json` `images[]` (AC-4.11). Never writes `reviewStatus` itself (BR-12). Prints the `imageUrl: '/images/vocab/{id}.webp',` line per published word (ADR-5) and refreshes the coverage report. |
| (no npm alias; `node scripts/check-attribution.mjs`) | `scripts/check-attribution.mjs` | C3 bidirectional: every file in `public/emoji/svg/` is under collection `twemoji` `paths`; every `public/emoji/lottie/{k}.json` has a key `k` in `lottieKeys.generated.json` and vice versa; every `public/images/vocab/{id}.webp` has exactly one `images[]` record with `reviewStatus:'approved'` + `reviewedBy`/`reviewedAt` set + license in {cc0,by} and `id` exists in ALL_WORDS; every record's `file` exists; zero files under `src/assets/` (A-07); schema check for required fields (9.2); exit non-zero listing every violation (AC-4.9, AC-7.11). |
| (build gate) | `scripts/check-bundle-budget.mjs` | Parse `dist/index.html`; take the entry `<script type="module" src>` and `<link rel="stylesheet" href>`; `zlib.gzipSync(buf, {level:9})` each; print both sizes in kB (bytes/1024, 2 dp) plus baseline deltas (84.46/3.96); exit 0 iff JS <= 94.5 kB and CSS <= 5.0 kB, else exit 1 naming file + excess (AC-2.10). |

`sharp@0.35.x` is added as a pinned devDependency (DEP-2): native prebuilds, maintainer-machine only, never in the runtime bundle. Rejected alternatives: `jimp` (weak WebP encode, slower), `imagemin` chain (more deps, same native reliance via `imagemin-webp`).

`public/attribution.json` is seeded by hand once with the two collections from PRD 9.2 (`version` = the pinned Twemoji release and the Noto download date) and `images: []`; thereafter only `publish-vocab-images.mjs` mutates `images[]`.

**Consequences.** `npm run build` stays offline (AC-4.10); the human review gate is structural (SAFE: no file reaches `public/` without an approved record); coverage reporting is free on every script run.

**Constitution impact.** #3 license allow-list (BR-08 re-verified per result), SAFE review gate, C3, #8 sanitization (BR-14), R4 resume behavior.

### ADR-12: Test strategy - global lazy-player mock in `setup.ts` (T-4), pure-logic-first unit tests, e2e `data-emoji-mode` assertions

**Context.** jsdom cannot run canvas/WASM; NFR-9 says jsdom mocks the player while Playwright verifies real rendering. Design-spec 9.2 asks whether editing `src/test/setup.ts` is permitted under the 6.0 allowlist.

**Decision - allowlist verdict (answers designer Q4): editing `setup.ts` is allowed.** Reasoning: 6.0 constrains edits to *existing test files' assertion/behavior content* (T-1, T-2, T-3, T-5) plus new additions (T-4: "new tests (additions), including new shared helpers"). `setup.ts` is test infrastructure, not a test file with assertions; the change adds infrastructure exactly like the existing `SpeechRecognition`/`getUserMedia` stubs it already contains (same precedent, same justification: jsdom lacks the API). No existing test line is modified or weakened. It is recorded as T-4 in the Dev report for transparency.

**Mock shape.** `vi.mock('../components/EmojiLottiePlayer', ...)` in `setup.ts` replaces the wrapper module (not the npm package) for every test file: the stub calls `onReady()` on mount (after `await`-friendly microtask, so `findBy*` assertions see mode `lottie` settle) and renders `<span data-lottie-stub aria-hidden="true" />`. This keeps `data-emoji-mode="lottie"` deterministic in jsdom without any WASM/canvas. Per-test overrides remain possible via `vi.mocked`/module re-mock for error-path tests (or the stub honors a module-level `__failNext` flag the EmojiVisual unit tests set - simplest: the stub imports a tiny mutable config object `src/test/lottieStubControl.ts`, also new T-4).

A minimal `matchMedia` stub returning `matches: false` is added alongside (existing tests never query it; `usePrefersReducedMotion` treats missing matchMedia as `no-preference`, so the stub only exists to give new reduced-motion unit tests a controllable seam via `vi.spyOn(window, 'matchMedia')`).

**New unit tests (all T-4):**
- `emojiKey.test.ts` - the 7 design-spec key examples + every distinct bank emoji + parity with `scripts/lib/emojiKey.mjs`.
- `emojiAssets.test.ts` - `hasLottie` positives/negatives; `lottieKeys.generated.json` <-> `public/emoji/lottie/` bijection (fs read, AC-1.6-adjacent drift guard); **AC-1.6 fitness**: every `toEmojiKey(emoji)` for ALL_WORDS + mascot emoji has `public/emoji/svg/{key}.svg`.
- `renderMode.test.ts` - pure state-machine truth table incl. count>1 forcing and the breaker flag.
- `EmojiVisual.test.tsx` - DOM contract per design-spec 3.4 (one img + one sr-only span; `emoji.repeat(count)`; mode transitions on `error` events via `fireEvent.error(img)`; 2500 ms timeout via `vi.useFakeTimers`; `onImageError` fired once; `data-emoji-ready`).
- `wordVisual.test.ts` - AC-5.9 (lookup, undefined for unknown id, built-once map).
- `imageBank.test.ts` - AC-4.9 direction `VocabWord.imageUrl -> file -> approved record`, plus record `wordId` exists in ALL_WORDS.
- `dashGuard.test.ts` - AC-7.9 sweep of `src/` + `public/attribution.json`.
- `attributionSchema.test.ts` - 9.2 field validation over `public/attribution.json` + `image-staging` schema parity where present.
- Generator tests: BR-15 exclusion (sad/cry case, AC-9.3); `optionWordIds`/`wordId`/`promptWordId` population and parallelism (AC-5.8); sentence-class table (AC-11.1-11.4) + baseline snapshot (AC-11.5/11.6); `buildRound1Questions` composition/order/seeds (AC-9.1/9.2, plus T-1 per-slice rewrite of `round1ExtraLetter.test.ts`).
- `CreditsScreen.test.tsx` - copy, empty/error/loading states, plain-text URLs, focus.
- `ListeningImageChoiceQuestion` group-fallback test (DS-3).

**e2e (Playwright, production `vite preview`):**
- New `e2e/emoji-visual.spec.ts`: `data-emoji-mode` assertions per context (image-choice prompt `lottie` or `image`, grid options `svg`, mascot `svg` + accent `lottie`, feedback picture), `data-emoji-ready`, reduced-motion emulation produces zero players and zero lottie requests (AC-2.7), forced failure path to `svg`/`native` (route interception, AC-2.8).
- New `e2e/credits.spec.ts`: entry only on GradeSelect, open/back, sections render, no outbound hrefs (AC-7.1-7.6, AC-7.10).
- New `e2e/same-origin.spec.ts` (or extend `batch-full-flow`): record every request through GradeSelect -> Credits -> full Batch -> summaries; assert all URLs share the page origin and the entry chunk lacks `dotlottie` (AC-2.5/2.6/8.2, C4 runtime gate).
- Allowlisted edits only: `batch-flow.ts`/`mascot-flow.ts` gain an image-choice branch + a `advanceToFirstQuestionOfKind` helper (T-2/T-4); T-5 sites per risk register.

**Consequences.** jsdom suite stays fast and deterministic; real player verified only in Chromium. The global mock is the single seam that keeps every existing component test (which transitively render Mascot/FeedbackPanel) from touching WASM.

**Constitution impact.** #7 TDD (RED before GREEN per AC), #2 (allowlist discipline), C4 runtime check is the primary gate.

### ADR-13: Credits screen wiring and focus management

**Context.** US-7 + D-3 + design-spec 5.6: `App` gains screen `'credits'`; entry button only on GradeSelect; data from `/attribution.json` only; focus moves to the h1 on open and returns to the entry button on back (AC-7.10, design-spec 5.6).

**Decision.**
- `App.tsx`: `type Screen = 'grade-select' | 'start-batch' | 'batch' | 'credits'`; `handleOpenCredits` sets `'credits'`; `handleCloseCredits` sets `'grade-select'` and arms a one-shot `ref`/state `focusCreditsLinkOnReturn` consumed by GradeSelect.
- `GradeSelect.tsx`: new optional props `onOpenCredits?: () => void` and `autoFocusCreditsLink?: boolean`. The pill renders only when `onOpenCredits` is provided (no dead control; keeps `GradeSelect.test.tsx` type-valid per design-spec 5.6). With `autoFocusCreditsLink`, a `useEffect` focuses the button ref once.
- `CreditsScreen.tsx`: on mount, `h1Ref.current?.focus()` (`tabIndex={-1}`); fetches `${import.meta.env.BASE_URL}attribution.json` via `src/lib/credits/attribution.ts` (`fetchAttribution(): Promise<AttributionFile>` + `licenseLabelFor(image)` implementing `cc0 -> "CC0 1.0"`, `by -> "CC BY {licenseVersion}"`); states loading (3 pulse skeletons with `motion-reduce:animate-none`, C6) / error / data per design-spec 5.6. URLs render as text only - no anchors anywhere (AC-7.5).

**Consequences.** Focus contract satisfied without DOM queries leaking across components. Credits renders zero players (keeps the A-09 non-question cap trivially).

**Constitution impact.** #1 (no outbound links), #3/#9 (attribution, vi copy), C6 (paired motion-reduce).

---

## 3. File-by-file implementation map

### 3.1 New runtime files

| Path | Exports | Depends on | Satisfies |
|------|---------|------------|-----------|
| `src/lib/emoji/emojiKey.ts` | `toEmojiKey(emoji: string): string` | none | BR-06, AC-1.6 (ADR-3) |
| `src/lib/emoji/emojiAssets.ts` | `svgUrl(key)`, `lottieUrl(key)`, `hasLottie(key)`, `emojiKey` re-export | `emojiKey.ts`, `lottieKeys.generated.json` | BR-06, BR-07, AC-2.2 (ADR-3/4) |
| `src/lib/emoji/lottieKeys.generated.json` | string[] of Twemoji keys (sorted) | written by `fetch-emoji-assets.mjs` | AC-2.2 (ADR-4) |
| `src/lib/emoji/wordVisual.ts` | `getWordVisual(wordId)`, `type WordVisual` | `ALL_WORDS` | BR-05, AC-5.6, AC-5.9 (ADR-5) |
| `src/lib/emoji/renderMode.ts` | `EmojiRenderMode`, `initialMode`, `modeAfterImageError` | `emojiKey.ts` | BR-03, BR-04 (ADR-1) |
| `src/lib/emoji/lottieRuntime.ts` | `isLottieDisabledForSession`, `disableLottieForSession`, `markLottieReady`, `hasLottieEverRendered`, `LOTTIE_READY_TIMEOUT_MS` | none | DS-9, AC-2.8 (ADR-6) |
| `src/hooks/usePrefersReducedMotion.ts` | `usePrefersReducedMotion(): boolean` | none | AC-2.7, C6 (ADR-1) |
| `src/components/EmojiVisual.tsx` | default `EmojiVisual`, `EmojiVisualProps` | `renderMode`, `emojiAssets`, `lottieRuntime`, `usePrefersReducedMotion`, `EmojiVisualErrorBoundary`, lazy `EmojiLottiePlayer` | BR-01..BR-04, AC-1.x, AC-2.x, AC-5.x (ADR-1/2/6) |
| `src/components/EmojiVisualErrorBoundary.tsx` | class boundary `{onError}` | react | AC-2.8 (ADR-6) |
| `src/components/EmojiLottiePlayer.tsx` | default `{lottieKey,onReady,onError}` | `@lottiefiles/dotlottie-react` (pinned `0.19.16`), wasm `?url`, `emojiAssets`, `lottieRuntime` | AC-2.1..2.8 (ADR-6) |
| `src/lib/credits/attribution.ts` | `AttributionFile`/`AttributionCollection`/`AttributionImage` types, `fetchAttribution()`, `licenseLabelFor()` | none (fetch) | 9.2 schema, AC-7.x (ADR-13) |
| `src/components/CreditsScreen.tsx` | default `CreditsScreen` | `attribution.ts` | AC-7.1..7.8 (ADR-13) |
| `src/types/assets.d.ts` | `declare module '*.wasm?url'` | none | ADR-6 typing guard |
| `src/data/vocabulary/party.ts` | `PARTY_TOPIC`, `PARTY_WORDS` | types | AC-6.1/6.2 |
| `src/data/vocabulary/seaside.ts` | `SEASIDE_TOPIC`, `SEASIDE_WORDS` | types | AC-6.1/6.2 |
| `src/data/vocabulary/kitchen.ts` | `KITCHEN_TOPIC`, `KITCHEN_WORDS` | types | AC-6.1/6.2 |
| `src/data/vocabulary/camping.ts` | `CAMPING_TOPIC`, `CAMPING_WORDS` | types | AC-6.1/6.2 |
| `src/lib/generators/listeningSentenceFillBlank.baseline.json` | baseline snapshot (283 words) | produced by dump script | AC-11.5/11.6 (ADR-10) |

### 3.2 New scripts and assets

| Path | Purpose |
|------|---------|
| `scripts/lib/emojiKey.mjs` | script-side copy of the key rule (pinned by parity test, ADR-3) |
| `scripts/fetch-emoji-assets.mjs` | Twemoji SVG + Noto Lottie + `lottieKeys.generated.json` (AC-4.12) |
| `scripts/fetch-vocab-images.mjs` | Openverse stage-1 fetch/normalize/staging (AC-4.1..4.8) |
| `scripts/publish-vocab-images.mjs` | approved-only publish to `public/` + attribution.json (AC-4.11) |
| `scripts/check-attribution.mjs` | C3 + AC-4.9 + lottieKeys drift + src/assets ban |
| `scripts/check-bundle-budget.mjs` | AC-2.10 entry budget |
| `scripts/dump-sentence-baseline.mjs` | one-shot producer of the baseline JSON (kept for reproducibility) |
| `public/attribution.json` | seeded collections + `images:[]` |
| `public/emoji/svg/{key}.svg`, `public/emoji/lottie/{key}.json`, `public/images/vocab/{wordId}.webp` | committed assets |
| `docs/image-bank-coverage.md` | generated report (AC-4.7) |
| `src/test/lottieStubControl.ts` | mutable stub control for player error paths (T-4) |

### 3.3 Modified files

| File | Change | ACs |
|------|--------|-----|
| `src/types/index.ts` | additive fields per ADR-8 diff | AC-5.8, BR-05 |
| `src/types/pairMatching.ts` | `PairMatchingPair.wordId` | AC-5.8 |
| `src/lib/generators/imageChoice.ts` | `wordId` + BR-15 emoji-exclusion filter | AC-9.3, AC-5.8 |
| `src/lib/generators/listeningImageChoice.ts` | `optionWordIds` parallel to options | AC-5.4, AC-5.8, AC-10.1 |
| `src/lib/generators/extraLetter.ts` | `wordId` | AC-5.8, AC-10.1 |
| `src/lib/generators/listeningSentenceFillBlank.ts` | `wordId` + `sentenceClassFor` + new template tables | AC-5.8, AC-11.x |
| `src/lib/generators/countingImage.ts` | `promptWordId` + consume new distractor return shape | AC-5.8, AC-10.1 |
| `src/lib/generators/countingImageDistractors.ts` | return `{options, wordIds}` | AC-5.8 |
| `src/lib/generators/describeAndChooseImage.ts` | `optionWordIds` via tracked pool words | AC-5.8, AC-10.1 |
| `src/lib/generators/picturePairMatching.ts` | `toPair` adds `wordId` | AC-5.8 |
| `src/lib/rounds/round1ExtraLetter.ts` | `buildRound1Questions` mixed pool per ADR-9 | AC-9.1/9.2 |
| `src/components/ImageChoiceQuestion.tsx` | prompt -> `<EmojiVisual variant="block" animated imageUrl={getWordVisual(question.wordId)?.imageUrl}/>`; prompt div gains `[@media(max-height:420px)]:text-6xl` (DS-4) | AC-1.4, AC-2.4, AC-5.1, AC-9.4 |
| `src/components/ListeningImageChoiceQuestion.tsx` | options -> `EmojiVisual variant="block" loading="lazy"`; all-or-nothing photo set via `optionWordIds` + `hasPhotoError` group flag (DS-3) | AC-5.4, AC-5.7 |
| `src/components/CountingImageQuestion.tsx` | `repeatedEmoji` -> `<EmojiVisual count={option.count}/>` (prompt inline, options inline) | AC-1.2, AC-1.4 |
| `src/components/DescribeAndChooseImageQuestion.tsx` | options -> `<EmojiVisual count={option.count}/>` | AC-1.2, AC-1.4 |
| `src/components/PicturePairMatchingQuestion.tsx` | picture tiles -> `<EmojiVisual emoji={tile.label}/>`; word tiles plain text | AC-1.4, AC-5.5 |
| `src/components/Mascot.tsx` | 🐷 -> `EmojiVisual` static; accent -> `EmojiVisual animated`; wrappers/aria unchanged | AC-3.1..3.4, AC-1.9 |
| `src/components/FeedbackPanel.tsx` | optional `picture?: {emoji; imageUrl?}`; `<EmojiVisual className="ml-[0.3em]" animated .../>` inside the "Từ đúng là:" p after the word span | AC-10.x, AC-3.2 |
| `src/components/QuestionCard.tsx` | `correctWordId(question)` per US-10 table + `getWordVisual` -> `picture` prop for the 5 yes kinds | AC-10.1 |
| `src/components/GradeSelect.tsx` | `onOpenCredits?`, `autoFocusCreditsLink?`, credits pill (DS-6 classes) | AC-7.1, AC-7.10 |
| `src/App.tsx` | `'credits'` screen + handlers + focus return | AC-7.2, AC-7.10 |
| `src/data/vocabulary/actions.ts`, `feelings.ts` | append 2 + 4 words under the PRD comment | AC-6.1 |
| `src/data/vocabulary/index.ts` | register 4 topics, `WORDS_BY_TOPIC`, comment 24->28 | AC-6.2 |
| `src/test/setup.ts` | `vi.mock` of `EmojiLottiePlayer` + matchMedia stub (T-4 infra, ADR-12) | AC-1.5, NFR-9 |
| `package.json` | dep `@lottiefiles/dotlottie-react` pinned `0.19.16`; devDep `sharp` pinned `0.35.x`; scripts `assets:emoji`, `assets:images`, `assets:images:publish` | DEP-1, DEP-2, US-4 |
| `.gitignore` | `image-staging/` | US-4 note |
| `vite.config.ts` | only if the AC-2.5 `dotlottie` leak materializes (ADR-6 contingency) | AC-2.5 |
| e2e `utils/batch-flow.ts`, `utils/mascot-flow.ts` | image-choice branch + kind-advance helper (T-2/T-4) | AC-9.5, AC-9.6 |
| T-1/T-5 unit + e2e files listed in PRD 6.0 | per-category edits only | AC-9.6 |

### 3.4 TDD implementation order

1. **Types + pure logic (no UI):** ADR-8 type fields (RED: generator tests asserting new fields fail type-check) -> populate generators -> BR-15 fix with `sad`/`cry` test (AC-9.3) -> `countingImageDistractors` wordIds refactor.
2. **Vocabulary + sentences:** baseline dump script -> commit baseline JSON -> RED snapshot test (AC-11.5/11.6) + class tests (AC-11.1-11.4) -> `sentenceClassFor` + 4 topic files + index registration -> invariants green (C9, AC-6.x, AC-11.8 unchanged).
3. **Round 1 pool:** RED `buildRound1Questions` composition tests (AC-9.1/9.2) -> implement per ADR-9 -> T-1 rewrite of `round1ExtraLetter.test.ts` -> T-5 unit-site fixes (seed pin or kind-advance helper with comment).
4. **EmojiVisual static path:** `emojiKey`/`emojiAssets`/`renderMode`/`wordVisual` tests (RED) -> implement -> `EmojiVisual` svg/native/count>1/text-layer tests -> swap the 6 sites one at a time, running each site's existing test file after each swap (must stay green untouched - C2 check).
5. **Lottie path:** `setup.ts` mock (T-4) -> `EmojiVisual` lottie tests with stub (ready, timeout via fake timers, breaker flags, reduced-motion) -> real `EmojiLottiePlayer` + `setWasmUrl` -> swap `animated` at the 3 sites -> e2e verify (AC-2.x).
6. **Photos:** `imageBank.test.ts` (green trivially with zero imageUrls) -> `onImageError` + ListeningImageChoice group fallback -> publish pipeline once a human has approved candidates.
7. **FeedbackPanel picture + QuestionCard wiring:** T-3 fixture fields (non-bank ids, zero assertion changes) -> RED `picture` tests (AC-10.1/10.6) -> implement -> e2e `extractRevealedWord` unchanged check (AC-10.4).
8. **Credits:** `attribution.ts` + `CreditsScreen` tests -> `App`/`GradeSelect` wiring -> e2e credits spec.
9. **Scripts + gates:** `fetch-emoji-assets.mjs` -> real assets + `lottieKeys.generated.json` -> `check-attribution.mjs` -> `check-bundle-budget.mjs` -> image fetch/publish scripts.
10. **e2e updates + new specs:** T-2 helpers, T-5 sites, `emoji-visual.spec.ts`, `credits.spec.ts`, same-origin recording spec -> full gate: `npm test && npm run build && node scripts/check-bundle-budget.mjs && node scripts/check-attribution.mjs && npm run test:e2e` (AC-8.3).

---

## 4. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|------------|--------|------------|
| R-1 | Existing emoji-text tests break when glyphs become imgs | Medium | High (allowlist breach) | sr-only layer (ADR-2) is designed specifically so `getByText`/`toHaveTextContent`/`innerText`/`toBeVisible` all keep passing; C2 gate re-runs `npm test` after each site swap (step 4 swaps are one-at-a-time). |
| R-2 | Tests asserting exact `textContent`/`toBe` on feedback or options break once a picture is appended | Low-Medium | Medium | T-3 fixtures deliberately use non-bank `wordId`s so `getWordVisual` returns undefined and FeedbackPanel markup is unchanged (AC-10.6); FeedbackPanel picture is additive inside a paragraph asserted via `toHaveTextContent` (substring match survives the appended emoji span). Dev report must list any assertion that still needed a touch under T-3 and justify. |
| R-3 | Shuffled Round 1 (D-10 A) breaks fixed-position assumptions (F-13: `App.test.tsx:106,195`, `BatchScreen.test.tsx:72`, `batchSession.test.ts:239`, 9 e2e sites) | Certain (known breakage) | Medium | Bounded by T-5: kind-advance helper or documented pinned seed; AC-9.6 requires keeping each test's original assertion target. Pre-scan all F-13 sites in step 3 before GREEN. |
| R-4 | Entry bundle budget breach (JS 84.46 + 10.04 = 94.5 kB; CSS 3.96 + 1.04 = 5.0 kB) | Medium (CSS headroom is thin) | Medium (build gate) | Estimate: EmojiVisual + emoji libs ~1.5-2.5 kB gzip; `lottieKeys.generated.json` ~1 kB; wordVisual ~0.3 kB; Credits + attribution ~1.5-2 kB; total JS +4-6 kB -> ~88-91 kB (inside). CSS: new utilities (`sr-only`, `h-[1em]`, `w-[1em]`, `align-[-0.125em]`, `mx-[0.05em]`, `ml-[0.3em]`, `transition-opacity`, `duration-150`, `animate-pulse`, `break-all`, credits classes, `[@media(max-height:420px)]` variant) ~+0.3-0.6 kB gzip -> ~4.3-4.6 kB (inside but watch). Mitigations: reuse existing classes verbatim so Tailwind dedupes; no new tokens; `check-bundle-budget.mjs` fails early in CI. |
| R-5 | `dotlottie` string leaks into the entry chunk via emitted chunk filenames/preload map | Low-Medium | Medium (AC-2.5 literal) | Single-importer structure keeps dep inside the lazy chunk; fallback `chunkFileNames`/`sanitizeFileName` rename documented in ADR-6; the AC-2.5 grep makes a leak fail loud. |
| R-6 | `.wasm?url` import unsupported/misbehaving under Vite 5.4 or vitest | Low | Medium | Verified official pattern for this exact package (wiki + issue #423 + PR #204); vitest never loads it because the wrapper module is mocked globally; contingency = committed `public/vendor/dotlottie-player.wasm` (ADR-6). |
| R-7 | AC-5.8 "unchanged" vs BR-15/US-11 content changes | N/A (interpreted) | Low | Recorded interpretation in ADR-8; snapshot + invariance tests bound the deltas to the spec'd sets. |
| R-8 | Noto key mapping edge cases (fe0f-in-ZWJ, keycaps) produce missing/mis-keyed Lottie files | Medium | Low | `fetch-emoji-assets.mjs` normalizes Noto index entries through the same key rule, prints an uncovered list (AC-4.12); `hasLottie` only advertises keys whose file exists (script writes both together); EmojiVisual falls back to `svg` for misses. |
| R-9 | Openverse quota stalls image bank (200 req/day) | Medium | Low (no code blocker) | Resume-safe staging (AC-4.6); coverage report exposes gaps; app fully functional with zero photos (all-or-nothing rule + fallback chain) - image bank is additive, never blocking US-1/2/9/10. |
| R-10 | jsdom tests that mock `matchMedia` globally now see reduced-motion | Low | Low | Stub defaults `matches:false`; only new tests opt in via spy. |
| R-11 | `lottieKeys.generated.json` drifts from `public/emoji/lottie/` | Low | Low | Bidirectional check inside `check-attribution.mjs` (ADR-4). |
| R-12 | Player cap regression (a future `animated` call site) | Low | Medium | C5 grep + a unit test asserting `animated` appears only in the three allowed files (fast string check, executable rule per CONVENTIONS). |

Estimated public/ growth: ~285 SVG x ~2-8 KB + ~130 Lottie JSON x ~30-100 KB = ~6-9 MB (RK-5, within Vercel static limits; Tester reports exact).

---

## 5. Designer open questions - verdicts (design-spec section 12)

| # | Question | Verdict | Where |
|---|----------|---------|-------|
| 1 | `onImageError` prop (DS-3 group fallback) | **Confirmed.** `onImageError?: () => void` on EmojiVisual, fired once per mount when a photo `error` event fires, before the mode advances. `ListeningImageChoiceQuestion` holds `hasPhotoError` state; any option's callback flips all four to `svg`. | ADR-1, design-spec DS-3 |
| 2 | DS-9 session circuit breaker | **Confirmed with one refinement.** Breaker (`lottieDisabledForSession` in `lottieRuntime.ts`) trips on: chunk-import rejection, player runtime error (`onError('runtime')` after valid JSON), or a ready-timeout while no player has ever rendered this session. Single JSON 404/data failure does NOT trip it - the wrapper fetches the JSON itself (`data` prop) precisely so data vs runtime failures are distinguishable. | ADR-6 |
| 3 | 2500 ms timeout | **Confirmed.** `LOTTIE_READY_TIMEOUT_MS = 2500` in `lottieRuntime.ts`; measured from lottie-mode mount to first frame; leaves 500 ms headroom under the AC-2.8 3000 ms bound. | ADR-1/6 |
| 4 | Global `setup.ts` Lottie mock vs AC-1.5/6.0 allowlist | **Allowed, category T-4.** 6.0 restricts edits to existing *test files*; `setup.ts` is shared test infrastructure (precedent: its existing speech/getUserMedia stubs). Mock targets our wrapper module `EmojiLottiePlayer`, not the npm package, so every jsdom test gets a deterministic stub and no WASM/canvas code loads. Recorded as T-4 in the Dev report. | ADR-12 |
| 5 | File paths (design-spec 9.2) | **Confirmed as listed**, with three additions and one format change: add `src/lib/emoji/renderMode.ts` (pure state machine), `src/lib/emoji/lottieRuntime.ts` (breaker + timeout constant), `src/components/EmojiVisualErrorBoundary.tsx`; and `lottieKeys.generated.ts` becomes `lottieKeys.generated.json` (ADR-4). | sections 3.1/3.2 |
| 6 | `hasLottie` key-set format | **Sorted JSON array** at `src/lib/emoji/lottieKeys.generated.json`, imported via `resolveJsonModule` (already enabled); wrapped as a `Set` in `emojiAssets.ts`; drift-checked both directions against `public/emoji/lottie/` by `check-attribution.mjs`. | ADR-4 |

---

## 6. Cross-cutting invariants (executable rules summary)

| Rule | Enforcement | Source |
|------|-------------|--------|
| All emoji pictures render via EmojiVisual; `question.emoji`/`tile.label` never render as raw text outside BR-01 exceptions | C2 grep + AC-1.4 DOM audit | constitution C2, BR-01 |
| Emoji-char assets resolve by emoji key; photos by `wordId` via `getWordVisual` only | AC-5.6 code check; module exposes no other lookup | BR-05, A-06 amended |
| No runtime request leaves the app origin | e2e request recording (C4) + static `grep https?:// src/` allowlist | #4, A-05, BR-07, AC-8.2 |
| `animated={true}` exists only in `ImageChoiceQuestion.tsx`, `FeedbackPanel.tsx`, `Mascot.tsx` | C5 grep + unit assertion | #5, A-03, A-09, AC-2.3/2.9 |
| `public/` assets fully attributed both directions | `check-attribution.mjs` exit 0 | C3, BR-13, AC-7.11 |
| No U+2013/U+2014 in `src/` or `public/attribution.json` | `dashGuard.test.ts` | #8, BR-14, AC-7.9 |
| No photo without `reviewStatus:'approved'` + reviewer fields; scripts never write `approved` | publish filter + AC-4.9/4.11 | SAFE, BR-12 |
| Entry JS <= 94.5 kB / CSS <= 5.0 kB gzip | `check-bundle-budget.mjs` in the deploy gate | NFR-1, AC-2.10 |
| Unchanged-vocab sentences byte-identical; changed set = exactly 71 words | baseline snapshot test | AC-11.5/11.6 |
| Existing tests untouched outside T-1/T-2/T-3/T-5 | Dev report lists file:line per category | 6.0, AC-1.5, AC-9.6 |

---

## 7. Traceability: PRD scope items -> ADRs/files

| Scope item (PRD section 12) | ADR(s) | Primary files |
|-----------------------------|--------|---------------|
| S1 EmojiVisual + Twemoji + text layer | ADR-1, 2, 3, 7 | `EmojiVisual.tsx`, `emojiKey.ts`, `emojiAssets.ts`, `renderMode.ts`, 6 component swaps |
| S2 Animated layer | ADR-1, 4, 6 | `EmojiLottiePlayer.tsx`, `lottieRuntime.ts`, `lottieKeys.generated.json`, Mascot/ImageChoice/FeedbackPanel `animated` sites |
| S3 Image bank + fallback chain | ADR-5, 8, 11 | `wordVisual.ts`, payload fields, pipeline scripts, `imageBank.test.ts` |
| S4 Vocabulary | (content spec, PRD 7.1) | 4 new topic files + actions/feelings appends + index registration |
| S5 Credits | ADR-13 | `CreditsScreen.tsx`, `attribution.ts`, `App.tsx`, `GradeSelect.tsx` |
| S6 Deploy | ADR-11 (gates) | `check-bundle-budget.mjs`, `check-attribution.mjs` feeding AC-8.3 |
| S7 image-choice in live Round 1 | ADR-8, 9 | `round1ExtraLetter.ts`, `imageChoice.ts`, T-1/T-2/T-5 test edits |
| S8 FeedbackPanel picture | ADR-1, 5, 8, 13 | `FeedbackPanel.tsx`, `QuestionCard.tsx`, additive payload fields |
| S9 Topic-aware sentences | ADR-10 | `listeningSentenceFillBlank.ts`, baseline JSON, snapshot test |

---

## 8. Dependency changes

| Package | Type | Pinned version | Reason | Constitution check |
|---------|------|----------------|--------|--------------------|
| `@lottiefiles/dotlottie-react` | dependency | `0.19.16` (exact, `--save-exact`) | DEP-1; ships `setWasmUrl`; pulls `dotlottie-web@0.80.0` whose `dist/dotlottie-player.wasm` is imported via `?url` | MIT code; assets same-origin via ADR-6 |
| `sharp` | devDependency | `0.35.x` (exact) | DEP-2; WebP normalize <=512px/<=80KB, metadata strip (AC-4.4) | maintainer-machine only; never in the bundle |

No other dependency changes. Node >= 18 required for scripts (native `fetch`, `node:zlib`, `node:fs`).

---

## 9. CR-06 addendum - phonics nang sau (final sounds / blends / rhyming)

Tech Lead artifact for PRD section 15. Extends the CR-03 derived-phonics
model (ADR pattern: dimensions derived from `word`, never stored on
`VocabWord`) with three new dimensions and three new question kinds.

### 9.1 Derivation modules (new `src/lib/phonics/` files)

| Module | Contract | Rule summary |
|--------|----------|--------------|
| `finalSounds.ts` | `getFinalSound(word) -> letter \| digraph` | last token; exceptions table; `-ck`->`k`; digraphs sh/ch/th/ng; doubled collapse; `-ee`->`e`; silent-e strip with soft-c->s/soft-g->j; fallback last letter |
| `blends.ts` | `getInitialBlend(word) -> cluster \| null` | first token; 3-letter list (scr/shr/spl/spr/squ/str/thr/sch) checked before 2-letter list (bl..tw, qu); digraphs and silent onsets excluded by absence |
| `rhymes.ts` | `getRhymeGroup(word) -> key`, `rhymesWith(a,b) -> boolean` | spelled rime of last token (last vowel cluster + tail, silent-e aware) + `RHYME_OVERRIDES` word->group for false-positive splits and cross-spelling merges; containment exclusion (token run or embedded compound) inside `rhymesWith` |

Final-sound letter-level convention (BA 15.6): groups key by the letter
the ending sounds like at Grade 2 level - `-se/-ce`->`s`, `-ge`->`j`,
`ck`->`k`; voiced/unvoiced nuance is an accepted residual.

Rhyme overrides are AUDIT-DRIVEN: a deterministic script enumerated all
58+ spelled-rime families in the bank; every family was judged by sound,
not spelling. Notable splits (same spelling, no rhyme): mountain/rain,
elephant/eggplant->`ant-weak` (ant alone), scared/tired/surprised/
excited/red, two/shoe/toe spellings, cow/`-ow`, cry+fly+butterfly/`-y`,
read/bread, lion/`-ion`, cookie/`-ie`, foot/boot, hot/`-ot`, one/`-one`,
ear/`-ear`, island/`-and`, swan/`-an`, chocolate/`-ate`. Notable merges
(true rhyme, different spelling): plane->`ain`, square+chair->`ear`,
one->`un`, bread->`ed`, two+shoe+canoe+blue+kangaroo->`u-long`,
cry+fly+butterfly->`i-rime`, calendar+caterpillar->`ar-weak`. Any word
without a real partner gets a `solo:<word>` key and can never generate a
rhyme question.

### 9.2 Generators (new `src/lib/generators/phonicsDeep.ts`)

Same pool contract as `generators/phonics.ts`: up to 2 deterministic
variants per eligible word; Round 4 draws a stratifiedSample slice.

- `generatePhonicsFinalChoiceQuestions` - every word eligible; distractor
  universe = all bank final sounds; excludes same-phoneme keys via
  `equivalentSounds` (c/k guard carries over to 'c'-final words like
  mechanic/garlic).
- `generatePhonicsBlendChoiceQuestions` - only `getInitialBlend !==
  null` words; distractors are other bank-present blends (never bare
  letters - the skill is isolating the cluster).
- `generatePhonicsRhymeChoiceQuestions` - only words with >= 1 real
  partner (`rhymesWith` over the bank) generate; the correct option is a
  seeded partner pick; distractors must be a different group AND not
  token/embedded-contained in the prompt (a contained word would either
  rhyme-by-rule or visibly leak the answer); `optionWordIds` parallel to
  options for AC-5.8 + FeedbackPanel picture.

All three return the question array directly (no nulls in the pool - a
word that cannot form a valid question simply contributes no variant).

### 9.3 Question payloads (additive, `src/types/index.ts`)

| Kind | Key payload fields | Correct option | FeedbackPanel picture |
|------|--------------------|----------------|------------------------|
| `phonics-final-choice` | word, wordId, emoji, sound, options(4 letters) | sound = `getFinalSound(word)` | `wordId` (prompt word) |
| `phonics-blend-choice` | word, wordId, emoji, blend, options(4 clusters) | blend = `getInitialBlend(word)` | `wordId` (prompt word) |
| `phonics-rhyme-choice` | word, wordId, emoji, rhymeGroup, options(4 words), optionWordIds | the unique rhyming option | `optionWordIds[correctIndex]` (rhyming word) |

`getCorrectWord` additions: `âm "X"` (final, same format as sound), `cụm
"X"` (blend), the rhyming option word (rhyme). `submitOptionAnswer`
kind allowlist extended - all three score via `selectedIndex ===
correctIndex`, no new submit path.

### 9.4 Round 4 re-composition (ruling 15.3 A)

`round4DescribeAndChooseImage.ts`: 3 describe + 3 pair-matching + 4
phonics = 10. The phonics block = 1 sound + 1 word + 1 final + 1 slot
alternating blend/rhyme by `hashString` seed parity (empty-pool fallback
to the other kind). Every phonics sub-skill surfaces in every Batch;
blend AND rhyme both appear across any two consecutive seeds (test
asserts over 10 seeds).

### 9.5 File map

New runtime: `src/lib/phonics/{finalSounds,blends,rhymes}.ts`,
`src/lib/generators/phonicsDeep.ts`,
`src/components/{PhonicsEndingChoiceQuestion,PhonicsRhymeChoiceQuestion}.tsx`.
Modified: `src/types/index.ts`, `src/lib/practiceSession.ts`
(getCorrectWord + submitOptionAnswer), `src/components/QuestionCard.tsx`
(routing + feedbackPictureWordId), `src/lib/rounds/round4DescribeAndChooseImage.ts`
(composition), `src/components/questionCardFixtures.ts` (3 fixtures),
e2e kind allow-lists (`practice-flow.ts`, `round34-flow.ts`,
`pair-matching-flow.ts`, `batch-flow.ts`, 2 spec files).
New tests: 3 phonics module tests, `phonicsDeep.test.ts`, 2 component
tests; extended `questionWordIds.test.ts`,
`QuestionCard.feedbackPicture.test.tsx`, `round4DescribeAndChooseImage.test.ts`,
`batchSession.test.ts`, `BatchScreen.test.tsx`, `App.test.tsx`.

### 9.6 Invariants enforced by tests

- Bank-wide: every word maps to a letter/digraph final key; blend
  detection returns exactly the audit cluster set; `rhymesWith` is
  symmetric over all bank pairs; every documented false-positive pair is
  asserted non-rhyming and every cross-spelling merge pair asserted
  rhyming.
- Per-question: 4 distinct options, exactly one correct (final: matches
  derived sound and no same-phoneme distractor; blend: derived cluster
  only; rhyme: exactly one `rhymesWith` option, prompt never among
  options).
- Integration: wordId/optionWordIds resolve to bank words (AC-5.8);
  Round 4 always carries the 5 base kinds + exactly one alternating
  slot; determinism per seed.

---

## 10. CR-09 addendum - app-level design system implementation

Implements design-spec section 14. Approach: codify the design language
as exported class-token constants (extending the established
`actionButtonStyle.ts`/`optionButtonStyle.ts` pattern - the codebase
already treats shared classes as constants, so tokens land as a bigger
version of the same mechanism, no CSS-in-JS or theme plugin needed).

### 10.1 Token module

`src/lib/ui/tokens.ts` (new) exports class constants:

- `PAGE_BG` - applied once on the app root (`App.tsx`), not per screen.
- `CARD` / `CARD_TINT(color)` - content card + tint surfaces.
- `H1` / `H2` / `BODY` / `PROMPT` - type tokens (display font on H1/H2).
- `CHIP_*` - the header-bar pills (`CHIP_SKY`, `CHIP_AMBER`,
  `CHIP_EMERALD`, `CHIP_NEUTRAL`): `inline-flex items-center gap-2
  rounded-full bg-{c}-50 px-4 py-2 text-lg font-bold text-{c}-800
  ring-1 ring-{c}-200`.
- `NAV_PILL` - back/credits ghost buttons (>=76px-min target kept via
  `min-h-[76px]` where used as standalone; inside rows `py-3` accepted
  per existing conventions).
- `SCREEN_ENTER` - `animate-screen-enter motion-reduce:animate-none`.
- Reuses: `actionButtonStyle.ts` constants get token-aligned values in
  place (same export names - zero call-site churn for buttons).

`optionButtonStyle.ts` keeps its signature; internals restyled to the
token semantics (ring borders, `active:scale-[0.97]`, `shadow-sm`).

### 10.2 Tailwind config additions

- `fontFamily.display: ['"Baloo 2"', 'system-ui', 'sans-serif']` used by
  H1/H2/points/grade cards/CTAs.
- `keyframes['screen-enter']`: `{ from: {opacity:0, transform:translateY(8px)}, to: {opacity:1, transform:none} }`,
  `animation['screen-enter']: 'screen-enter 200ms ease-out'`.

### 10.3 Font - Baloo 2 self-hosted (DS-U1, AC-UI4)

- Source: `@fontsource/baloo-2` npm package (OFL-1.1). Copy the
  vietnamese + latin `woff2` files for weights 600/700/800 into
  `public/fonts/baloo-2/` at maintainer time (committed like the
  Twemoji/Lottie bundles - same-origin, no CDN).
- `@font-face` in `src/index.css` with `font-display: swap` and
  `unicode-range` per subset.
- License recorded: `public/attribution.json` gains a `fonts` entry +
  Credits screen lists it (AC-UI4 reuses the existing attribution
  pipeline + check-attribution gate).

### 10.4 File-by-file refresh map

| File | Change |
|------|--------|
| `src/App.tsx` | root gets `PAGE_BG` + `SCREEN_ENTER` on screen container |
| `tailwind.config.js` | display font + screen-enter animation |
| `src/index.css` | @font-face + body gradient support |
| `actionButtonStyle.ts` / `optionButtonStyle.ts` | token values in place |
| `GradeSelect.tsx` | scene layout + disc grade tiles |
| `StartBatchScreen.tsx` | scene card + dominant CTA |
| `BatchScreen.tsx` | header strip (progress pill + track + timer chip + score chip) replaces scattered lines |
| `QuestionCard.tsx` | content card wrapper; progress line merges into header strip |
| `FeedbackPanel.tsx` | tint banner treatment |
| `RoundSummary.tsx` / `BatchSummary.tsx` | coin points + tint breakdown rows |
| `CreditsScreen.tsx` | token typography + font entry |
| `RoundProgress.tsx` / `RoundTimer.tsx` / `LiveScore.tsx` | render as header chips (same testids) |
| `AudioPlaybackWarning.tsx` | tint banner token |
| `public/fonts/baloo-2/*`, `public/attribution.json` | new assets + license |

No testid, accessible name, DOM structure or logic changes - the e2e
and unit contracts are the regression harness (AC-UI2/AC-UI6).

### 10.5 Verification plan

- Unit: full suite unchanged green; component tests that assert
  styling use testids/roles not classes (verified in code review).
- E2E: 49/49 unchanged; responsive specs re-verify reachability on
  the new chrome at 420px landscape.
- Visual: Playwright walkthrough of every screen by the agent (not
  only assertions - actual look review on desktop + phone frames).
- Gates: `check-attribution` extended to fonts; bundle budget re-based
  if the woff2 files land inside dist (they live in public/, copied
  verbatim - measure and record).
