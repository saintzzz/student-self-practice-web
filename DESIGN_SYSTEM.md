# DESIGN_SYSTEM.md

> The official design reference for **English Arena - VieSchool**. Every future
> page, section, component, and UI update must follow this file so the design
> stays consistent. Source of truth in code: `src/lib/ui/tokens.ts` +
> `src/lib/ui/theme.ts`. This document mirrors them - update both together.
>
> **CR-73 (v2):** the approved redesign spec is
> `docs/design/v2/DESIGN-SPEC-v2.md`; requirement change record is
> `docs/sdlc/CR-73-full-redesign.md`. Semantic token layers, the inline
> ModeHub IA, exam gold remediation and the revised state contracts below
> are normative - the older free-form classes they replaced are gone.

---

## 1. Project overview

- **Product name:** English Arena - VieSchool (`ea.vieschool.com`)
- **Website type:** app/product UI - gamified English practice for kids
- **Surface profile:** App / Product UI (with landing-style journey map)
- **Platform:** responsive web (mobile-first, 375→1280)
- **Target users:** Vietnamese primary students (Grades 1-5), teachers, parents, admins
- **Main design goal:** playful, readable, kid-friendly arena that still reads as
  a credible commercial VieSchool product - high contrast, big targets, zero
  visual ambiguity.

## 2. Brand direction

- **Visual style:** playful-adventure "journey map" on a premium navy/gold brand
  shell. Cards float like game tiles; gold = treasure/reward language.
- **Mood & tone:** warm, encouraging, game-like; Vietnamese-first copy.
- **Design personality:** playful/kids - rounded, bold, tactile.
- **Design concept:** *"a treasure-map adventure inside a VieSchool-brand navy
  arena"* - expressed through per-grade "land" card identities (sky/playground/
  town/jungle/city/space), gold treasure accents for stars/scores, a pig mascot
  (🐷), and spring-physics micro-celebrations.
- **Adversarial-review verdict:** with the name covered it could read as a generic
  kids app - what keeps it distinctive is the navy/gold VieSchool shell unifying
  every surface (login, play, admin) plus the per-land card tint system. Weakness
  found in CR-44 audit: light-mode text colors (`text-amber-200`, `text-sky-700`)
  leaked onto light or dark surfaces where they fail contrast - fixed by the
  surface-pairing rule in §3.
- **Reference style:** self-derived (VieSchool brand) + kid-app exemplars
  (Duolingo streak/pill language, Khan Academy Kids palette restraint).
- **Voice & UX copy:** warm Vietnamese kid-facing ("em", "nhé", "của em"),
  verb-first CTAs ("Làm bài kiểm tra đầu vào", "Chơi thử"), errors always say
  what happened + what to do. **No em/en dashes in UI copy - plain hyphen only.**

## 3. Color system

Two coordinated systems: the **brand shell** (navy/gold, all chrome) and the
**land tints** (per-grade card accents inside the map).

| Role | Color | Value | Usage |
|---|---|---|---|
| 60% - Dominant | VieSchool navy | `#0b1224` → `#101a36` gradient (`brand.pageGradient`); exam surfaces `#0d1b26` | page backgrounds |
| 30% - Secondary | navy card | `from-[#162C55]` to `[#0E1F42]` (`CARD`), `#121b33/90` (`CARD_DARK`) | cards, panels |
| 30% - Secondary | light "paper" panels | `bg-sky-50` + `ring-sky-100` | tables/reports inside dark cards |
| 10% - Accent | VieSchool gold | amber-300→500 gradients; `amber-300/400` text on navy | CTAs, stars, score, focus rings |

**Land card tints** (map only, `theme.ts`): sky / lime / emerald / indigo /
violet `*-50/95` card + `*-400/500` disc + `*-800/900` accent text.

**Status semantics (do not remap, CR-73 amended):** emerald = correct/go,
rose = destructive/urgent-status only (answer-wrong is desaturated slate
`feedback.wrong` - never red-shaming), amber = warning/progress, sky = info,
**indigo = audio** (interactive listen controls only - no longer "exam").
**Gold fills = reward + next-step actions only** (≤1 gold CTA per screen;
`reward.earned` gradient allowed on pet-evolve / quest-claim).

### Semantic token layers (CR-73)

`tokens.ts` now carries named semantic layers on top of the legacy exports
(names kept for compatibility - import tokens, never re-spell classes):

- **Hub (paper panel inside navy launchpad):** `HUB_PANEL` light panel,
  `TRAIL_TILE` 96px G1-2 / `TRAIL_TILE_SM` 76px G3-5 section tiles,
  `TRAIL_TILE_EXPANDED` selected wash, `BTN_DRILL` / `BTN_ADVANCED` paper
  secondary actions, `BTN_EXAM` navy exam-register entries,
  `BTN_PAPER_ACTION` strong paper rows (sky-700+white = 5.93:1).
- **Exam (`exam.card` `#16232e`):** `EXAM_OPTION` 64px option/key tile,
  `EXAM_SELECTED` orange **ring** + orange-200 text (the old orange-500
  fill + white text was 2.80:1 - banned), `EXAM_NAV_CELL` 48px strip cell,
  `EXAM_NAV_ANSWERED` emerald translucent + check icon (8.11:1,
  never color alone - `aria-current="step"` + sr-only label on current).
- **Actions:** `BTN_AUDIO` (indigo = every Nghe-mẫu/listen control),
  `BTN_SECONDARY_NAVY` (white/10+sky-200 = 9.19:1),
  `BTN_SECONDARY_PAPER` (sky-100+sky-800 = 6.59:1),
  `BTN_REWARD_EARNED` (gold gradient - reward moments only).
- **Focus rings:** navy surfaces `focus-visible:ring-amber-300/60`;
  paper surfaces `focus-visible:ring-sky-600` (4.1:1 non-text on white;
  sky-400 was 2.14:1 and is banned on paper).

### Surface-pairing rule (CR-44 - the bug this file exists to prevent)

Every text color is bound to a **surface class**, never picked in isolation:

- **On navy/dark surfaces** (`CARD`, `CARD_DARK`, page bg, exam `#0d1b26`):
  light text only - `amber-200/300/400`, `sky-200/300`, `emerald-300`,
  `rose-300`, `slate-300`, `white`. Never `*-600/700/800/900` text.
- **On light surfaces** (`bg-white`, `*-50` cards, `bg-amber-100` chips, light
  land cards): dark text only - `amber-700/800/900`, `sky-700/800/900`,
  `slate-600/700`. Never `*-100/200/300` text.
- **Translucent chips** (`bg-*-500/15`) are dark-surface elements - they sit on
  navy only. A light-tinted chip (`bg-amber-100`, `CHIP_GOLD`) must pair with
  dark text (`text-amber-900/950`).
- **Never compose a token over an overriding surface** - e.g. `CHIP_AMBER`
  (`text-amber-200`) + light gradient bg = invisible (the CR-44 bug, 1.11:1).
  If you need a new pairing, add a named token; don't stack conflicting classes.

Computed pairs (verified): `amber-950` on amber-100→200 = **11.7:1**;
`amber-700` on `lime-50` = **4.85:1**; `amber-400` on `#0E1F42` = **9.7:1**;
`sky-300` on `#0E1F42` = **9.7:1**; `sky-800` on white = **7.6:1**.

**Dark mode:** the app IS dark-mode-primary (navy shell); light panels are the
exception surface (paper reports). No theme switch.

## 4. Typography system

- **Personality:** playful/kids → rounded display + readable humanist body.
- **Fonts (both self-hosted woff2, `font-display: swap`):**
  - Display: **Baloo 2** (`font-display`) - headings, scores, grade numbers.
  - Body: **Be Vietnam Pro** (`font-sans`) - all Vietnamese body/UI copy
    (shared with vieschool.com + teacher apps).
- **Scale (Tailwind steps, no one-off inline sizes):**
  display `text-4xl/6xl font-extrabold font-display`; h1 `text-3xl sm:4xl` (`H1`);
  h2 `text-2xl`; card title `text-2xl font-display font-extrabold`;
  body-lg `text-xl` (`PROMPT`); body `text-base`; body-sm `text-sm`;
  caption `text-xs`; buttons `text-sm→xl font-bold/extrabold`.
- **Body minimum 16px** (`text-base`); captions ≥12px.
- **Responsive:** headings step down via `sm:` variants; `[@media(max-height:420px)]`
  compacts pill heights on short landscape screens.

## 5. Layout system

- **Containers:** `max-w-3xl` journey map, `max-w-2xl` summary, `max-w-xl`
  dialogs, `max-w-md` auth.
- **Spacing:** page `px-4 py-6 sm:py-8`; cards `p-6 sm:p-8`; chip gaps `gap-2`.
- **Page anatomy (journey map):** nav pills (top-right) → mascot → H1 journey
  title → subtitle → placement CTA → engagement chips → parent-report pill →
  grade card grid (`grid-cols-1 sm:grid-cols-2 gap-6`) → footer (stacked:
  image-source pill row, then attribution row).
- **Page anatomy (launchpad, CR-73):** back nav → gold `Chơi` CTA →
  (G3-5 only: DailyQuestCard) → inline **ModeHub** sections → footer.
  The old bottom-sheet `ExploreSheet` IA is replaced by `ModeHub`
  (`src/components/ModeHub.tsx`) - all sections collapsed on first paint,
  collapsed children unmount while empty `hub-panel-*`/`hub-section-*`
  region wrappers stay mounted as valid `aria-controls` targets.
  G1-2 first paint ≤4 decisions (Back, Chơi, Luyện thêm, Phần thưởng) with
  per-program subtiles (English/Math/Science/Arena/Review, ≤4 new controls
  per expansion); G3-5 ≤6 (Back, Chơi, quest card, Luyện & thi, Đấu trường,
  Phần thưởng) with grouped sections.
- **Touch targets (CR-73 band floors):** 76px G1-2 standalone; 64px G3-5
  standalone (drill/exam/secondary rows); 48px kid non-standalone controls;
  44px admin/adult minimum; 36px chips in a row.
- **Breakpoints:** 375 mobile / 768 tablet / 1280 desktop; cards 1→2 cols at `sm`.

## 6. Component system

- **Component base:** native React + Tailwind token constants (no UI library).
  Every primitive is a named export in `tokens.ts` - import, never re-spell.
- **Key primitives:**
  - `CARD` / `CARD_DARK` - navy raised surfaces.
  - `NAV_PILL` / `NAV_PILL_DARK` - 76px rounded nav buttons (amber-200 text,
    `bg-white/10`, glass).
  - `CHIP_*` - `CHIP_SKY`, `CHIP_AMBER`, `CHIP_AMBER_URGENT`, `CHIP_EMERALD`
    (translucent, navy-only), **`CHIP_GOLD`** (light gold gradient + amber-950
    text - the only light chip).
  - `SCORE_PILL` / `SCORE_PILL_LG` - gold treasure score pills (amber-950 text).
  - `CARD_TINT.*` - translucent status panels on navy.
  - `SCREEN_ENTER` - shared enter animation.
- **Buttons:** `CTA_GOLD_XL` (the one gold primary path per screen),
  `BTN_SECONDARY_NAVY`/`BTN_SECONDARY_PAPER` (action.secondary by surface),
  `BTN_AUDIO` (action.audio indigo), `BTN_REWARD_EARNED` (reward.earned gold),
  `BTN_EXAM`/`BTN_DRILL`/`BTN_ADVANCED` (hub entries on paper),
  `BTN_PAPER_ACTION`/`BTN_PAPER_SECONDARY` (parent/admin paper rows),
  `BTN`/`BTN_SECONDARY`/`BTN_DANGER` legacy exports. All ship
  hover/press/`focus-visible` states per §11.
- **Card action classification (CR-73):** review/coach start, arena accept,
  arena create/bot and guest login → `action.secondary`; pet evolve +
  quest claim → `reward.earned`; `arena-exit` → `action.secondary`
  (never gold, never destructive).
- **ModeHub (CR-73):** inline accordion - `hub-tile-*` top tiles control
  `hub-panel-*`; `hub-subtile-*` nested tiles control `hub-section-*`.
  `aria-expanded` + `aria-controls` + Enter/Space + per-expansion headless
  `InstructionSpeaker` prompts. Arena challenge lists are capped with
  "Xem thêm" inline expansion (explicit tap-budget exception).
- **End-session control (CR-55):** every in-progress play surface carries a
  `bg-sky-600` uppercase action in the top chrome - `KẾT THÚC` (drill,
  batch) / `NỘP BÀI` (exam). Solid sky (not a translucent chip) so it reads
  as an action, `active:scale-95`, `focus-visible` ring; it resolves to the
  result screen, never a dead confirm.

## 7. Card & section style

- **Style:** soft-elevated rounded cards - `rounded-3xl` (cards), `rounded-full`
  (pills), `rounded-2xl` (rows/inputs).
- **Elevation:** layered navy gradient + inset top highlight + deep soft shadow
  + hairline ring (`ring-[#2a3a5e]`). Depth comes from surface + shadow; rings
  are 1px definition, not elevation.
- **Gradients:** navy `to-b` (shell/cards), gold `to-b` (treasure accents),
  land `to-b` page gradients inside the map only.
- **No nested elevated cards; no card-in-card-in-card.** Light "paper" panels
  inside dark cards are the sanctioned exception (reports/tables).

## 8. Icon system

- **UI chrome (CR-72/CR-73):** `src/components/icons.tsx` - hand-drawn SVG
  icon set (stroke 2, rounded caps, chunky kid-friendly grid 24):
  chevrons (up/down for hub disclosure), arrows (back/next, replacing
  unicode `←`/`→`/`➜` chrome), speaker/audio, trophy, medal, star, flame,
  clock, compass, refresh, flag, check, gift, flask, muscle, handshake.
  Always `aria-hidden` + paired with text labels.
- **Content illustration:** `EmojiVisual`/Twemoji renders emoji (🐷⭐🔥🏅🍎🐱)
  as the pedagogical illustration language - intentional for a kids product.
- **Rule:** emoji = content/illustration, SVG icons = UI chrome. Neither is
  the sole carrier of state (earned vs locked stickers also differ by
  `???`/name + dimming; exam answered cells carry a check icon + text).

## 9. Image & asset rules

- **Logo:** text wordmark + pig mascot emoji.
- **Content images:** self-hosted (`public/images/vio/`, `public/images/...`)
  with provenance tracked in the image-source credits footer + `docs/` source
  registry. Never hotlink third-party images.
- **Treatment:** rounded, fixed dimensions (`width`/`height` or aspect), no
  decorative-only images without alt handling.

## 10. Animation & interaction system

- **Library:** CSS keyframes only (`index.css`) + Tailwind transitions.
  Animations are **transform/opacity only**, always paired with
  `motion-reduce:` static fallback.
- **Signatures:** `screen-enter` (fade + 8px rise), `chest-wiggle`, `stars-pop`,
  `land-drift`, `sticker-chip` slide-in.
- **States:** every interactive element ships hover (lift/lighten),
  `:focus-visible` ring (`focus:ring-4 focus:ring-amber-300/60` family),
  active (`scale-95` press), disabled (opacity). Pointer cursor on all controls.
- **Async:** buttons show working state; exam/audio ops have loading UI.
  Success = explicit visual (score pill, banner, chip) never color alone.

## 11. Accessibility rules

- **Contrast: compute, don't eyeball** (WCAG formula in
  `.devin/skills/ui-ux-kit/references/quality-floor.md`). Body ≥4.5:1, large
  (≥24px or ≥19px bold) ≥3:1. Verified pairs listed in §3.
- **Surface-pairing rule (§3) is mandatory** - it exists because text/bg pairs
  were shipped broken twice.
- **Focus:** `focus-visible` ring on every interactive element - amber-300/60
  family on navy, `sky-600` on paper (3:1 non-text minimum); never
  `outline:none` without replacement.
- **Semantics:** real `button`/`a`/`footer` elements; `data-testid` on all
  interactive content; `aria-expanded`/`aria-pressed`/`aria-current`/
  `aria-hidden` where relevant; decorative emoji/icons `aria-hidden`.
  Hub tiles: `aria-expanded` + `aria-controls` naming `hub-panel-*` /
  `hub-section-*` region ids (regions stay mounted when collapsed).
  Exam strip: answered cells get check icon + `status.success` tint;
  current gets `aria-current="step"` + sr-only text - both, not color alone.
- **Motion:** `prefers-reduced-motion` honored everywhere (`motion-reduce:`).
- **Never color alone:** states pair icon/emoji + label + tint.

## 12. Anti-AI-slop rules (project additions)

Canonical gate: `.devin/skills/ui-ux-kit/SKILL.md` pre-flight check - run it
before shipping any UI. Project-specific:

- **Approved palette:** navy `#0b1224`/`#101a36`/`#0E1F42`/`#162C55`/`#0d1b26`;
  Tailwind amber/sky/emerald/rose/lime/indigo/violet ramps per §3; slate for
  neutrals. Nothing outside this set.
- **Emoji-as-illustration is intentional** (kids product) - exception to the
  "no emoji structural icons" ban; they still carry `aria-hidden` + text pairs.
- **Navy shell is deliberate**, including under light land cards - not a bug
  to "fix" back to light theme.
- **Every new chip/pill must declare its surface class** and pair text
  accordingly (§3). A token composed over an overriding bg = review fail.

## 13. Future page instructions

Reuse `tokens.ts` + `theme.ts` for every new screen/component. New visual
elements go through the token layer first - if a pairing isn't in §3, add a
named token with its computed contrast noted, don't freestyle classes.

## 14. Update policy

If colors, typography, components, animations, cards, or image style change,
update this file AND the token comment that introduced them in the same commit.
