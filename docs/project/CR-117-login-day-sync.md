# CR-117: Kid login joins the day register (AuthScreen sync)

## What / why

After CR-116 moved the journey map to the sunny day register, the login
screen still rendered the old navy/gold "brand night" surface - user
report: "màn login vẫn là màn hình cũ ... không đồng bộ". Root cause:
CR-116 classified `AuthScreen` as adult-facing and left it on
`land="brand" tone="night"`. The screen is actually student-facing
("Chào bé!" + PIN form), so it belongs to the kid world surface.

## Scope

- `App.tsx`: the login branch and the `authMode === 'loading'` splash
  mount `land="map" tone="day"` hero instead of `brand`/`night` - no
  navy flash between loading, login and the guest map.
- `AuthScreen.tsx`: full retune to day tokens - `CARD_DAY` form card
  pulled `-mt-[22vh]` into the seam of a compact `heroBandCompact`
  (36vh poster; the login is form-dominant so it gets a shorter band
  than the map's 58vh - external review r154). Submit CTA stays above
  the fold at both 1440x900 and 375x667 (measured 661px < 667).
  `INPUT_DAY` (white field, `sky-300` border,
  `amber-400` focus ring), `NAV_PILL_DAY` guest entry, `rose-700` on
  `rose-50` error, `bg-white/70` credit chip, golden medallion mascot
  (same idiom as the map header).
- `tokens.ts`/`DESIGN_SYSTEM.md`: comments + pairing law updated;
  rendered-pixel contrast table added.

## Out of scope

- No auth logic, callbacks, or guest flow changes.
- Adult surfaces (admin, credits, report, exam) and kid play boards
  keep their existing registers - day is kids'-world-only.

## Measured (rendered pixels, 1440x900 Chromium)

`sky-950` H1 13.2:1 · `sky-900` label 8.6:1 · `sky-800` sub 6.5:1 ·
`amber-800` eyebrow 6.5:1 · navy on `amber-400` submit 10.3:1 ·
`sky-900` guest pill 8.4:1 · `rose-700` error 5.4:1 · `slate-600`
credit chip 6.2:1 · `amber-800` guides link 5.0:1.

## Acceptance

- Login + loading render the world-map day hero; form card on
  `CARD_DAY` over the seam; submit visible above fold at 840px height.
- Guest button transitions to the same sunny map (verified).
- All text pairings >= 4.5:1 on rendered pixels (done, above).
- Reduced-motion and mobile 375px unchanged/sane (verified).
- tsc, tests, build, preflight green; external review loop clean.
