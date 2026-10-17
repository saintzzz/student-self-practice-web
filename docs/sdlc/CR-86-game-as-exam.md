# CR-86: Game-as-exam / outward composition

Status: drafted (implementation follows CR-85 ship)
Opened: PO ruling - "dung chinh game lam bai thi cung duoc" and game
activities should feed other EA features (reverse of CR-83's inward
assumption).

## Intent

- A game run IS a valid assessment: GameEnd already reports
  points/maxPoints/correctCount - map it onto exam/practice scoring.
- Exam flow may embed a registered game as one section (e.g. a
  PictureReveal section in a Grade-1 exam) instead of a static round.
- Practice surface may schedule game activities the same way it
  schedules rounds today.
- GAME_MECHANICS remains the contract: kinds a mechanic can host, the
  bare Step field, and the game shell that produces GameEnd.

## Architecture sketch (to confirm at Tech Lead)

- `GameSection` wrapper: mounts GAME_COMPONENTS[id] with
  seed = `exam:<examId>:<section>:<attempt>`, converts onEnd GameEnd
  into the section's score record; stars still flow through
  recordGameResult (idempotent).
- Config: exam schema gains optional `game?: GameId` on a section;
  renderers fall back to the classic form when absent.
- Practice "choi ma hoc" entry: quick-pick a game as a practice unit -
  completion counts toward daily quest via existing ledger paths.
