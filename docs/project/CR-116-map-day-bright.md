# CR-116: Journey map - day-bright register

Status: APPROVED (product-owner autonomy)
Date: 2026-11-02
Author: Devin (PO autonomy)

## Request

User feedback: "UIUX - map cần thay đổi một chút. Màu mè dành cho trẻ em,
tươi sáng hơn, trẻ trung hơn, từ cả ảnh, font chữ... hãy nghiên cứu thêm."

## Problem

The journey map (GradeSelect) rides `land="brand" tone="night"`: a dusk/
night lantern scene over flat navy for the lower ~60% of the page. All 7
`land-*.webp` scene arts are painted at golden dusk, so even `tone="day"`
postcards render evening streets/moonscape. Chrome tokens (NAV_PILL*,
H1 text-white, EngagementBar navy pill) all assume a dark canvas. The
result reads "cozy bedtime story" - the user wants "sunny adventure".

Competitor baseline (Duolingo path, Khan Kids, Lingokids, Monkey Junior):
bright sky-blue gradient canvas, chunky light cards, saturated accents.
Fonts are NOT the gap - Baloo 2 display + Be Vietnam Pro body already
match the kids register.

## Scope

Map screen only (GradeSelect + its shell + EngagementBar as rendered on
the map). Play boards keep dusk/night register (contrast/focus tested).
Adult surfaces (login/admin/credits) unchanged.

1. **New art** (artgen, ChatGPT soft-3D storybook, DAY light):
   - `land-map-day.webp` - bright daytime world-map hero: sunny sky, clouds,
     green meadows, winding golden path hinting the 5 lands.
   - `land-{playground,town,jungle,city,space}-day.webp` - day-lit
     variants of the 5 land scenes for postcard headers.
   - Attribution records + sourceFile/sha256 binding per r145 contract.
2. **`map` land key** in theme.ts (bright pageGradient; SCENE_BASE reuses
   sky palette so the vector LandScene fallback renders the sky scene).
3. **LandArt day resolution**: `tone="day"` tries `land-{key}-day.webp`
   first, falls back to base file, then vector - zero-regression chain.
4. **Shell**: grade-select branch uses `land="map" tone="day" hero`.
5. **Day chrome tokens**: `NAV_PILL_SM_DAY`, `H1_MAP`, `PROMPT_MAP`,
   engagement-bar day variant - white/translucent glass + dark slate ink,
   measured contrast on the rendered sky gradient.
6. **GradeSelect day retune**: trail dots amber-300 -> amber-500,
   guest-trial hint, no-scope card, social proof, footer link, mascot
   medallion bezel -> day register.
7. **EngagementBar `tone` prop** (default `dark` keeps existing look;
   map passes `day`).

## Non-goals

- Play board / question cards retune (separate register, still dusk).
- AuthScreen stays brand-night (adult-facing).
- No new fonts needed (Baloo 2 + Be Vietnam Pro already kids-grade).
- No GAME_DEFS / scoring changes.

## Acceptance criteria

- Map renders day scene + bright gradient; postcards show day art.
- All interactive chrome on the map passes measured contrast (>= 4.5:1
  text, >= 3:1 large/icon) on the rendered sky gradient.
- `prefers-reduced-motion` unchanged; no new infinite motion.
- LandArt fallback chain intact (missing day file -> base -> vector).
- Vitest + tsc + build green; Playwright screenshot verifies the map.
- External review loop round until clean.
- DESIGN_SYSTEM.md gains the day-register section.
