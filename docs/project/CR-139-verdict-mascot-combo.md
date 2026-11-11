# CR-139 - Verdict mascot reaction + session combo (UX research W46)

## Source
`docs/research/edu-apps/2026-W46-ux.md` decisions 1+2. Duolingo/Khan Kids
pattern: the character reacts to every answer and consecutive-correct
combos surface as micro-celebrations.

## Scope
- Practice verdict renders `Mascot` (companion size): `celebrating` on
  correct, `encouraging` on wrong. Reuses existing pose art + CSS mood
  motion - no new assets.
- `combo` = consecutive correct answers in the sitting; from 3+ a chip
  shows "N câu đúng liên tiếp!" with the existing `mascot-pop` keyframe.
  Silent reset on a wrong answer (kid-safe, no loss framing).

## Explicitly not done
- No hearts/lives, no punitive streak-loss UI (conflicts with pedagogy
  position - documented in the UX report).
- Exam/mock/assignment modes unchanged: verdict block is practice-only.

## Acceptance
- Correct verdict shows celebrating pig; wrong shows encouraging pig.
- 3rd consecutive correct shows the combo chip; wrong resets it.
- `prefers-reduced-motion` still lands on static art (MascotArt contract).
