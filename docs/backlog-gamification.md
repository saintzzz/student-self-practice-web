# Backlog: Gamification & Delight ("choi ma hoc, hoc ma choi")

PO-drafted backlog for making English Arena stickier for VN kids G1-5.
Priority: P0 = unlocks the rest / biggest learning impact, P1 = core loop
depth, P2 = polish. Estimates are dev-days, not promises.

## A. Core motivation loop

| # | Item | Pri | Effort | Why |
|---|------|-----|--------|-----|
| A1 | **Streak flame + daily quest** - "Hom nay lam 10 cau" quests with a flame counter that survives login. Streak freezes (1 free miss/week) so kids don't rage-quit. | P0 | 3d | The single biggest retention driver (Duolingo-proven). Needs `practice.daily_progress` table. |
| A2 | **XP + level ladder** - XP from every question (difficulty-weighted), level = visible rank (Newbie -> Star -> Hero -> Legend) with a progress ring on Home. | P0 | 3d | XP must come from effort not luck; pairs with existing score data. |
| A3 | **Collectible card album** - concepts already have art: each mastered topic drops a card (con vat, mon an, quoc gia...) into an album screen. Duplicate cards -> convert to XP. | P1 | 4d | Reuses 1,190 concept assets - zero new art needed. Collection = the "gotta catch em all" hook for this age. |
| A4 | **Pet/companion that grows with study** - a mascot (land emblems exist) that eats XP; stages egg -> baby -> junior -> adult. Neglect >7 days -> pet looks sad (gentle nudge, no punishment). | P1 | 5d | Emotional attachment keeps kids returning better than badges. |
| A5 | **Weekly mission board** - 3 missions/week auto-generated from weak skills ("Lam 15 cau nghe", "Dat 80% round tu vung"). Completing board -> chest. | P1 | 3d | Steers kids to weak skills without parent nagging. |

## B. In-game learning feel

| # | Item | Pri | Effort | Why |
|---|------|-----|--------|-----|
| B1 | **Combo/streak meter in Batch** - consecutive correct builds a combo multiplier with rising sound pitch + confetti at 5/10/15. Breaks on wrong answer. | P0 | 2d | Turns a quiz into a flow state; pure frontend + sfx. |
| B2 | **Boss battle batches** - every Nth batch is a "boss" (harder questions, bigger reward, themed art). Kid feels they're beating a level not taking a test. | P1 | 3d | Reskins existing batch flow, reuses question bank d4-5. |
| B3 | **Power-ups earned not bought** - hint token (eliminate 2 wrong), time-freeze, second-chance heart; earned via streaks, capped per session. | P1 | 3d | Teaches strategic thinking; must cap so it never inflates scores dishonestly. |
| B4 | **Adaptive difficulty dial visible** - a friendly "do kho" meter that visibly steps up as kid succeeds ("Ban gioi qua, thu cau kho hon!"). | P1 | 2d | Kids love seeing the game respect their growth. |
| B5 | **Lives/heart system in Game Zone only** - 3 hearts per game round, heart drops = retry encouragement not game-over harshness. | P2 | 2d | Arcade feel for the 14 existing games. |

## C. Social & arena

| # | Item | Pri | Effort | Why |
|---|------|-----|--------|-----|
| C1 | **Live Arena seasons** - weekly themed seasons ("Olympic mua he") with cumulative points, season badge on profile. | P1 | 4d | CR-97 arena is live; seasons give it a metagame. |
| C2 | **Class leaderboard (teacher-scoped)** - weekly top-N per class, shown to teacher + students in that class only (privacy-safe, no cross-school leaks). | P1 | 3d | Teacher can award real praise; leverages CR-98 class data. |
| C3 | **Co-op pair mode** - 2 kids answer together (turns alternate), shared score; builds teamwork in classroom demos. | P2 | 5d | Differentiator vs solo drill apps. |
| C4 | **Team battle: class vs class** - school-internal team arena, aggregate class score. | P2 | 6d | High hype but needs admin tooling; defer until C1/C2 prove engagement. |

## D. Rewards & economy

| # | Item | Pri | Effort | Why |
|---|------|-----|--------|-----|
| D1 | **Reward chest tiers** - bronze/silver/gold chests from missions; contents = cards/XP/pet food (never pay-to-win). | P1 | 2d | Random-reward dopamine with guaranteed floor. |
| D2 | **Badge gallery on profile** - named badges (Chuyen gia Phat am, Vua Tu vung, Sieu toc) with unlock criteria shown ("can them 3 cau nghe dung"). | P1 | 3d | Visible goals beat vague progress bars. |
| D3 | **Avatar builder unlocks** - new avatar parts unlock by achievements (hats, capes, pets skins). | P2 | 4d | Self-expression; needs art budget (ChatGPT queue). |
| D4 | **Parent-visible reward report** - weekly digest card to parent report screen ("con dat streak 7 ngay"). | P2 | 2d | Parents reinforce the loop at home. |

## E. Design-system upgrades (visual polish)

| # | Item | Pri | Effort | Why |
|---|------|-----|--------|-----|
| E1 | **Motion language pass** - consistent spring physics: buttons squish on press, correct answers pop, wrong answers wobble; 200-300ms, `prefers-reduced-motion` respected. | P0 | 3d | Premium feel = motion consistency, not more gradients. |
| E2 | **Sfx pack v2** - layered sfx: correct rising arpeggio, combo whoosh, chest fanfare, gentle wrong "bonk"; mute toggle respected globally. | P1 | 2d | Sound is half the game feel; existing sfx.ts is minimal. |
| E3 | **Particle budget system** - confetti/sparkle pool with perf cap (disable under `reduced-motion` or low-end device). | P1 | 2d | Delight without jank on school tablets. |
| E4 | **Illustrated empty/error states** - empty shelf = sleeping mascot; offline = mascot with broken kite. Kids forgive errors with a face. | P2 | 2d | |
| E5 | **Font scale for G1-2** - bigger glyphs, fewer words on screen, icon-first choices already shipped; extend to result screens. | P1 | 2d | |

## F. Anti-patterns to NEVER ship

- No leaderboards across strangers/schools (privacy + discouragement for weak kids)
- No pay-to-win, no real-money shop (school context)
- No punishment timers ("lose streak if you don't play today" pressure - use freeze instead)
- No reward for correct ANSWERS only - reward effort/consistency too, else kids guess-farm
- No chat between kids (child safety - out of scope entirely)

## Ordering proposal (PO call)

Sprint order: **A1 + A2 + B1** (motivation skeleton, ~8d) -> **A3 + E1** (collection + motion, ~7d) -> **A5 + D1 + D2** (mission+reward loop, ~8d) -> **B2 + C1** (boss+season metagame, ~7d) -> **A4** pet (needs art) -> rest.

Each item needs a CR doc + pipeline run per SDLC rules when picked up.
