# DESIGN_SYSTEM.md

> The official design reference for **English Arena - VieSchool**. Every future
> page, section, component, and UI update must follow this file so the design
> stays consistent. Source of truth in code: `src/lib/ui/tokens.ts` +
> `src/lib/ui/theme.ts`. This document mirrors them - update both together.

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

**Status semantics (do not remap):** emerald = correct/go, rose = wrong/danger,
amber = progress/score/star, sky = info, indigo = audio.

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
- **Touch targets:** `min-h-[76px]` for standalone interactive elements (tokens
  invariant); compact chips still `min-h-9`+ inside groups.
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
- **Buttons:** gradient pill (amber CTA) / `BTN`, `BTN_SECONDARY` (white pill on
  light), `BTN_DANGER` (rose); all with hover-lift/press-scale + `focus:ring-4`.
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

- **Library:** none - `EmojiVisual` renders kid-friendly emoji (🐷⭐🔥🏅) as the
  illustration language, always `aria-hidden` + paired with text labels.
- **Rule:** emojis are decoration/illustration, never the sole carrier of state
  or meaning (earned vs locked stickers also differ by `???`/name + dimming).

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
- **Focus:** `focus:ring-4` on every interactive element; never `outline:none`
  without replacement.
- **Semantics:** real `button`/`a`/`footer` elements; `data-testid` on all
  interactive content; `aria-expanded`/`aria-pressed`/`aria-hidden` where
  relevant; decorative emoji `aria-hidden`.
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
