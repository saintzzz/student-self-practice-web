# CR-81 - De-"AI look": design-system remediation

Status: approved in principle (user directive: "loại bỏ mọi triệu chứng AI
look mà SDLC có thể viết ra - design system đang rất tệ").
Scope: visual system only - no generator/scoring/audio/content changes.

## A. Audit evidence (screenshots 2026-10, build 2d4df5a+e720383)

Every symptom below was observed on the real served build at 390x844 -
`_audit/*.png` captures all 11 question kinds, hub, grade select, round
and batch summaries.

### S1 - The flat navy void
Every play/hub surface is the same flat `#0d1b26` -> `#162C55` gradient
plus a handful of 2px dots posing as stars. No horizon, no ground, no
scene. The brand's own metaphor - "Hành trình của Bé Heo qua 5 vùng đất"
(a journey through 5 lands) - exists in the COPY while the visual world
is empty space. Grade cards already carry tiny illustrated land strips
(hills, houses); the play surface never continues that world.

### S2 - Centered-column-everything
Every screen stacks identically: mascot/emoji -> amber centered headline
-> white centered subtext -> pill -> centered buttons. The single most
recognizable AI layout signature; question cards, summaries, hub and
batch-end all share it.

### S3 - Bare emoji as hero imagery
Option/prompt art is a raw emoji glyph floating on navy (giant baby face,
mountain, lips). Emoji-as-content is correct for this product, but a
real product frames illustration - ours is an unframed glyph on a void.

### S4 - The violet-gradient audio button
"Nghe" uses an indigo->violet gradient pill - the canonical AI-slop
gradient - on a navy/gold brand that has no violet role. On one screen
five button hues compete: gold CTA, violet audio, emerald "Kiểm tra",
sky "Nghe mẫu", slate ghost.

### S5 - Pill-chip spam
Every datum is a `rounded-full` pill: `10/100 điểm`, `80/400 điểm`,
`0 sao`, `0 ngày`, `Huy hiệu (0)`, `Câu x/10`. Pills are the only data
container in the system.

### S6 - Card-in-card nesting
ModeHub nests white "paper" cards inside a navy card inside a dark page -
elevated inside elevated inside elevated.

### S7 - One corner radius for everything
Cards, tiles, chips and buttons all sit at rounded-2xl/3xl - no shape
language distinguishing furniture from controls.

### S8 - ring-1 as the only elevation device
Every container separation is a 1px slate ring + one drop shadow. No
real depth hierarchy.

### S9 - Rainbow tint borders read random
The CR-79 indexed tints (sky/rose/violet/emerald cycling by index) look
like decorative random colors on navy - they carry no information.

### S10 - One typographic voice
Amber bold headline + white centered body on every screen; display type
exists only on phonics glyphs. No editorial structure.

### S11 - Dead mid-band on judged states
On answered screens the question zone sits ~50% empty between tiles and
the feedback sheet - content does not distribute across the card.

## B. Design concept (committed)

**"Bảng hành trình" - the journey board.** The copy already claims a
journey through 5 lands; the visual system becomes that journey:

- Play surfaces get a **land scene**: layered sky tinted to the grade's
  land hue (grade cards already assign one per grade), a ground strip at
  the viewport bottom, sparse silhouette accents (hill/tree/cloud
  shapes, CSS-only, no painted art).
- The question card reads as the **travel board** of the scene.
- Instruction becomes a **banner strip** (left-aligned text, mascot
  inline right) instead of a centered headline - breaks the column.
- Answer media sits in **framed exhibit tiles** (light inner panel
  behind the emoji, like a photo on a board).
- Button system collapses to **3 roles**: gold primary CTA; navy audio
  button (deep-navy face + amber icon - kills the violet gradient);
  quiet ghost secondary.
- Radius system distinguishes layers: scene/cards 24px, tiles 16px,
  controls 14px, chips full - not one radius everywhere.
- Tints gain meaning or leave: option tiles keep ONE neutral frame
  family; tint appears only on semantic states (hover/pending/judged).
  Hub icon chips keep their indexed tints (they differentiate modes -
  that is information, not decoration).

## C. Non-goals

- No open-world/parallax game map (still structured practice).
- No illustration asset pipeline - silhouettes are CSS/SVG shapes only.
- Exam surfaces stay formal navy/gold - unchanged.
- No content/generator/scoring changes; testids and aria contracts kept.

## D. Estimate & risk

Tokens + ~10 components + index.css. Risks: scene layers must never
steal pointer events or push tiles below floors; reduced-motion gets
static scene; contrast re-verified on new tints. Verified via existing
audit script + screenshots at 390x844/844x390/1280x800.
