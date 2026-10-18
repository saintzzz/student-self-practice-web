# CR-96 - Bespoke art unification (all imagery -> generated originals)

## Driver

Product-owner directive: every image in the app - backgrounds, animated
figures, bank imagery, collectibles, chrome - must be bespoke generated
art, and every screen (including deeply hidden ones) must follow the
current design system. Delivered as one synchronized pass, not piecemeal.

## Scope

1. **Mascot unification.** The flat SVG/Lottie pig (script-generated
   pose rig, CR-82 D-08/D-09) is replaced app-wide by `MascotArt`: the
   ChatGPT-generated Bé Heo pose set (`be-heo-idle/thinking/happy/
   celebrating/encouraging` + existing `be-heo-portrait` for greeting)
   animated by transform-only CSS mood motion (`.mascot-idle/rock/wave/
   bounce/nod/hop`). Same wrapper contract: `data-testid="mascot"`,
   `data-mascot-mood`, `role="img"` + Vietnamese aria-labels,
   one-mascot-per-screen invariant, reduced-motion statics. Renderer
   marker becomes `data-mascot-renderer="art"`. `MascotStaticPose`
   survives as the onError fallback so slots never break.
   `preloadMascotAssets` now warms the webp poses.
2. **Collectible art.** 21 sticker badges + 24 home items gain `art`
   fields pointing at generated webp (`/images/stickers/`, `/images/home/`);
   render sites (StickerAlbum, HomeShelf, GiftBoxPicker, ChestReveal,
   RoundSummary, ExamScreen badges, ParentReportScreen) use the new
   `ArtImg` component with keyed emoji fallback.
3. **Mass bank regen.** All remaining rendered-symbol rasters
   (1,133 concepts + 100 counting + 45 v3 = 1,278 files) regenerate as
   bespoke art via `manifest2.mjs`, overwriting in place - bank rows
   stay valid with zero migration.
4. **Element sweep.** `*-50` paper surfaces verified on-spec (light
   panels inside navy per §3); unicode chrome arrows already replaced
   by the SVG icon family; hardcoded hex uses limited to palette values.

## Out of scope (intentional)

- `EmojiVisual` Twemoji/Noto SVG+Lottie system stays the pedagogical
  illustration fallback (DESIGN_SYSTEM §8) - it is a vector system,
  not the raster-clipart class this CR removes.
- `LandScene` parallax engine stays - already bespoke authored art.
- Lottie rig files (`MascotRig`/`MascotLottie`/`poses.ts`) remain in the
  tree but are no longer referenced by `Mascot`.

## Verification

- vitest: mascot suites rewritten to the art contract (img src per mood,
  motion class, inline face art, aria labels, renderer='art').
- check-attribution extended (`/images/stickers/`, `/images/home/`).
- Browser sweep confirms art render + no console errors.
