# CR-99 - Gamification quick wins (backlog M-series + B-series batch 1)

## Driver

PO directive: "chon nhung cai co the lam luon trong backlog va xu ly luon -
muc tieu la san pham hoan thien va kho clone". Batch of backlog items that
are pure frontend (no new art, no DB schema, no migration risk while the
iMac LLM pipeline is running on the same repo).

Motivation per product goal: features that are hard to clone = deeply
integrated into our content/flow, not cosmetic skins.

## Scope (all in `docs/backlog-gamification.md`)

| Item | What ships |
|---|---|
| **M2** | Game Zone shelf restyle: 2-col cards, icon + one-line description + play affordance + level/progress footer where data exists |
| **M3** | "Teach me" affordance inside every practice activity - surfaces the existing per-question explanation BEFORE answering (kid-initiated hint), plus a "Let me try again" bail path consistent with the pattern |
| **M4** | Attempt-ladder mascot feedback in practice rounds: correct -> first-try-wrong ("ouch") -> second-try-wrong ("aww") -> gentle retry ("let's try again") states |
| **M6** | Locked "Coming Soon" zone/teaser on the map or Game Zone shelf |
| **M7** | 2-3 map/shelf easter-egg interactions (pet/wave/play micro-interactions) |
| **M8** | Read-aloud labels on zone/shelf entries via existing TTS (speaker icon pattern) |
| **B1** | Combo chip: persistent streak indicator beside the "Câu x/y" progress chip while answering (the in-sheet streak chip already existed but only shows post-answer) |
| ~~B5~~ | **Descoped** - each game owns its own loop and reports a single GameEnd; a generic hearts layer needs a per-game design pass, not a wrapper. Own CR later. |

Scope adjustments vs the backlog draft (code reality check):
- **M3/M8 merged**: instruction voice stays DISABLED on autoplay (CR-83
  collision). Shipped instead: a kid-tapped speaker inside QuestionBanner
  that replays the instruction on demand - no autoplay, no mic bleed,
  real pre-reader help.
- **M4 adapts** the attempt ladder to our 1-attempt-per-question model:
  consecutive-WRONG streak escalates headline + mascot mood.
- **M2** was already ~90% done (2-col cards, taglines, best-stars) -
  shipped the delta: per-card total-stars chip + locked teaser card.

Out of scope this CR: A1/A2 (streak/XP - needs `daily_progress` table +
economy tuning, separate CR), M1 world map (needs artgen), M5 guest mode
(auth flow change), B5 hearts (per-game design), C-series social,
D-series economy.

## Design constraints

- Vietnamese copy: hyphen `-` only.
- `prefers-reduced-motion` respected on all new animation.
- No punishment-timer mechanics (backlog F: never punish absence).
- Hearts/combo are per-round ephemeral state - no persistence, no DB.
- Reuse existing mascot assets + sfx.ts + TTS infra; zero new dependencies.

## Acceptance

- Each item visibly works in the real flow (Playwright-verify).
- lint + build + npm test green; `check-consistency.mjs` clean.
- External review round via Codex CLI after implementation.
