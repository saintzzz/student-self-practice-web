# CR-44 - Contrast audit: invisible star chip + surface-pairing rule

## What / why

User report: the "⭐ N sao" chip on the journey map showed yellow text on a
yellow background - effectively invisible. Root cause: `EngagementBar` composed
`CHIP_AMBER` (which carries `text-amber-200`, a dark-surface color) over a light
gold gradient override, producing **1.11:1** contrast (measured, not eyeballed).

The same class of bug - text color picked without regard to the surface it
lands on - existed in three more places, all found by computing WCAG ratios
in the real rendered page via Playwright (including `background-image`
gradients, which a `backgroundColor`-only walk misses).

## Impact assessment

| Area | Effect |
|---|---|
| `src/lib/ui/tokens.ts` | new `CHIP_GOLD` token (light chip + dark text) |
| `src/components/EngagementBar.tsx` | star chip uses `CHIP_GOLD` |
| `src/components/GradeSelect.tsx` | card star count `amber-600` -> `amber-700` |
| `src/components/celebrations/ChestReveal.tsx` | `sky-700` -> `sky-300`, `amber-600` -> `amber-400` on navy `CARD` |
| `src/components/PlacementScreen.tsx` | breakdown text `sky-900/700` -> `sky-200/300`, track `bg-sky-100` -> `bg-white/15` |
| `src/components/AdminScreen.tsx` | progress table wrapped in light paper panel (all light-surface colors now legal) |
| `DESIGN_SYSTEM.md` | NEW - documents the real token system + the surface-pairing rule |
| `.devin/skills/ui-ux-kit/` | NEW - installed UI/UX skill (arham777/ui-ux-kit) for future design work |

No logic, data, or API changes. Pure presentation + docs.

## Measured results (WCAG, computed)

| Element | Before | After |
|---|---|---|
| Star chip "⭐ N sao" | 1.11:1 (invisible) | **11.72:1** |
| Grade card "⭐ N sao" (lime-50/sky-50 card) | 2.99-3.08:1 FAIL | **4.71-4.85:1** |
| ChestReveal "Tổng kho sao" on navy | 2.74:1 FAIL | **9.74:1** |
| PlacementScreen breakdown on navy | ~1.5-2.7:1 FAIL | **>9:1** |
| AdminScreen progress table on navy | ~2.5-4:1 FAIL | all text on `sky-50` panel, **>7:1** |

Post-fix full-page audit (journey map, all text elements): **ALL PASS**.

## Process note

This CR ran the installed `ui-ux-kit` skill (`.devin/skills/ui-ux-kit/`) end to
end: redesign-audit profile -> measured contrast (not eyeballed) -> minimal fix
set -> adversarial pass -> `DESIGN_SYSTEM.md` written. The skill's quality-floor
contrast math is the same WCAG linearization used in the audit script.

## The rule going forward (documented in DESIGN_SYSTEM.md §3)

Every text color is bound to a surface class: light text (`*-200/300/400`) only
on navy/dark surfaces; dark text (`*-700/800/900`) only on light surfaces;
translucent chips are dark-surface elements; a light chip pairs with dark text.
Never compose a token over an overriding background - add a named token instead.

## Verification

- `tsc --noEmit` clean; GradeSelect tests 7/7; build green.
- Playwright on dev server: computed effective-bg contrast for every rendered
  text element on the journey map - ALL PASS; screenshot confirms readable
  star chip, chips, footer rows.
