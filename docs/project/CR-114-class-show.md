# CR-114: Sân khấu lớp (Class Show) - teacher-led projector mode

## Why

Competitive recon vs questoraplay.app (95 teacher-led classroom games,
149k/year, VN-first): their core moat is **one screen for the whole
class** - no student devices. EA today requires every student to log in
(Arena Live) or plays solo. For VN primary classrooms the teacher-led
mode is the difference between "app for homework" and "tool the teacher
uses live in class" - and it is the strongest demo artifact for the GTM
trial flow (demo teacher account opens it, projects, plays instantly).

## Scope

1. **ClassShowScreen** (`/src/components/ClassShowScreen.tsx`):
   - Setup: grade + subject pick (reuses exam programs), roster
     (comma-separated names, 8 VN sample names pre-filled, persisted to
     localStorage), question count (8/12/16).
   - Play loop: spotlight animation picks a student -> big-screen
     question -> teacher taps Reveal -> taps Đúng/Sai -> racer
     scoreboard animates (+10/correct).
   - Finale: top-3 podium + celebration.
   - Question source: `createExamFromBank` practice mode (works for
     guests via public RPC + Turnstile, same as existing drill flow);
     only kinds displayable big-screen are kept (grammar-mcq,
     true-false, text-answer with reveal, missing-letter, odd-pron,
     image-choice, word-order as display+verdict); unsupported kinds are
     filtered and the pool is over-fetched 3x to backfill.
   - Keyboard controls for projector use: Space = pick/reveal,
     ArrowRight = Đúng, ArrowLeft = Sai.
2. **Entry**: new hub tile "Sân khấu lớp" on StartBatchScreen (all
   grades, guests included - same browse-first gate philosophy as
   Questora samples).
3. **Social proof strip** on GradeSelect: "99.000+ câu hỏi · 290+ đề
   thi · 15 trò chơi" under the header - matches landing claims.
4. **Post-batch game suggestion**: BatchSummary gains an optional
   "Nghỉ giải lao" card suggesting one arcade game (closes the
   question->game reward loop Questora does per-answer).

## Non-goals

- No student-device join (Arena Live already covers that).
- No persistent class rosters in DB this round (localStorage only);
  teacher-class sync is a later CR.
- No new 3D art - reuse mascot/celebration components.

## Acceptance

- Guest can open Class Show, press play with sample roster, run a full
  8-question show end-to-end and reach podium.
- Logged-in flow identical; questions come from the real bank.
- lint + typecheck + build green; component test covers loop + scoring.
