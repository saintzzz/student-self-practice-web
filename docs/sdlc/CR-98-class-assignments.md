# CR-98 - Class assignments: teacher assigns, class submits, report + improvement loop

## Driver

Product-owner directive: "giao vien giao bai, 10 hoc sinh co tai khoan
vao lam cung mot de va cham diem -> bao cao -> improvement". A teacher
issues one fixed assignment to a whole class; every enrolled student
completes the SAME exam inside a deadline window; results are graded,
reported per-assignment, and weak skills feed an improvement loop.

## Scope

1. **Assignments (async same-đề for a class).**
   - New `practice.assignments` table: `id`, `class_id`, `seed`,
     `grade_id`, `program_id`, `question_count`, `title`,
     `opens_at`, `due_at`, `created_by`, status.
   - Same deterministic-seed machinery as Arena (CR-97): one seed ->
     identical question set for every student - fairness for grading.
   - All client access through SECURITY DEFINER RPCs
     (`assignment_create`, `assignment_list`, `assignment_take`,
     `assignment_submit`, `assignment_report`, `assignment_close`);
     RLS keeps direct table access blocked (CR-97 pattern).

2. **Teacher surface.**
   - Ruling (approved): add `accounts.role = 'teacher'` - a real
     teacher sees ONLY the classes they created
     (`classes.created_by = auth.uid()`), separate from `admin`
     who keeps the existing all-class view. Teacher gets a scoped
     AdminScreen variant: classes/enroll/progress/assignments for
     own classes; accounts+review tabs stay admin-only.
   - New "Giao bài" flow: pick own class -> grade/program/question
     count -> set deadline -> share join info. Class roster + join
     code already exist (CR-47).

3. **Student surface.**
   - "Bài tập" inbox on the student home: pending assignments with
     due date, state (chưa làm / đang làm / đã nộp).
   - Taking an assignment runs the existing ExamScreen with the
     assignment seed; submit persists a `results` row tagged with
     `form_id = assignment:<id>` (form_id column already exists) plus
     `qb_attempt_events` per question.
   - Ruling (approved): ONE attempt per student per assignment -
     graded like a real exam; the improvement loop (re-assignment)
     is the retry path, not re-submission.

4. **Report + improvement loop.**
   - Teacher report per assignment: completion rate, score histogram,
     per-question accuracy heatmap (from `question_snapshot` /
     `qb_attempt_events`), per-student row (score, time, late flag).
   - Improvement: aggregate wrong-answer skills/topics -> suggest the
     matching practice unit for re-assignment; students see their own
     missed-question review (existing review-queue mechanics).

## Impact assessment

- **Data model:** +1 table, ~6 RPCs (new migration `0043_assignments.sql`).
  Reuses `classes`/`enrollments`/`class_grade_scopes` (CR-47),
  `results` + `qb_attempt_events` (existing writes gain an assignment
  tag). No changes to `arena_*`, question bank, or engagement writes.
- **Client:** `src/lib/assignments.ts`; AdminScreen gains an
  "assignments" tab + create form + report view; student home gains an
  inbox card; ExamScreen gains `mode='assignment'` (seeded, submit ->
  assignment RPC). No realtime needed - async by design.
- **Infra:** none - same Supabase RPC pattern, no new services.
- **Risk:** exam forms already vary per grade; `class_grade_scopes`
  limits which grades a class may receive - assignment create must
  validate the class scope. Deadline semantics: accept late submits
  flagged `late` rather than hard-block (younger kids).

## Estimate

New feature work: migration + client lib + 3 UI surfaces (teacher
create/report, student inbox) + tests. Separate estimate per CR rules.

## Requirements (BA)

FR-1  Teacher creates an assignment for an OWN class: title,
      grade_id, program_id, question_count, opens_at, due_at.
FR-2  Assignment creation mints a server-side seed; every taker gets
      the identical question set (same code path as Arena seeding).
FR-3  Student inbox lists assignments for enrolled classes with state
      upcoming/open/in-progress? (n/a - single attempt)/done/late.
FR-4  Taking an assignment launches ExamScreen with the seed; exactly
      ONE attempt per student - a second take is refused server-side.
FR-5  Submit persists results row (form_id='assignment:<id>') +
      per-question qb_attempt_events, flagged late when past due_at.
FR-6  Teacher report per assignment: roster completion, scores,
      per-question accuracy, late flags - own classes only.
FR-7  Improvement: report lists the weakest skills/topics of the
      class and offers "giao luyen lai" - a new assignment seeded on
      the same weak skill set.

NFR-1 RLS: students read only own enrollments/assignments/attempts;
      teachers read/write only classes they created; anon denied.
NFR-2 role='teacher' added to accounts check; existing admin/student
      behavior unchanged (admin keeps global view).
NFR-3 No realtime dependency - inbox and report poll on view.
NFR-4 10-30 students per class burst: report query aggregates
      server-side in one RPC round-trip.

### Acceptance criteria (Gherkin)

AC-1.1 Given teacher T owns class C, when T creates an assignment for
       C, then it persists with a seed and appears in assignment_list
       for T.
AC-1.2 Given teacher T does NOT own class C, when T calls
       assignment_create(C), then the RPC raises not-owner/forbidden.
AC-2.1 Given assignment A with seed S, when two students take A, then
       both receive identical questions and options in order.
AC-3.1 Given student S enrolled in class C with open assignment A,
       when S opens the inbox, then A shows as open with its due date.
AC-3.2 Given assignment A where now > due_at and S has not submitted,
       when S opens the inbox, then A still opens but shows
       "qua han" - late submits are accepted and flagged.
AC-4.1 Given S already submitted A, when S calls assignment_take(A)
       again, then the RPC returns the prior attempt (no re-entry).
AC-5.1 Given S finishes A before due_at, when submit runs, then a
       results row exists with form_id='assignment:<id>' and
       per-question attempt events.
AC-5.2 Given S finishes A after due_at, when submit runs, then the
       attempt persists with late=true.
AC-6.1 Given 10 students, 6 submitted A, when T opens the report,
       then completion shows 6/10, each row shows score+time+late.
AC-6.2 Given teacher T2 does not own the class, when T2 calls
       assignment_report(A), then the RPC returns no data/forbidden.
AC-7.1 Given submitted attempts where question Q3 fails at 80%, when
       T opens the report, then Q3 appears in the weakest list with
       its accuracy.
AC-7.2 Given the weakest-skill list, when T picks "giao luyen lai",
       then a new assignment is created scoped to those skills.

## Design spec (Designer)

Token-faithful - reuse existing design system, no new visual language.

1. **Student "Bai tap" inbox** on grade-select (next to
   joinClassSlot): paper card listing open assignments - title,
   class name, due date (dd/mm), state chip
   (`Sap mo` slate / `Dang mo` amber / `Qua han` red / `Da nop` green),
   CTA `Lam bai` (BTN_PRIMARY) when open. Submitted rows are
   non-interactive and show score. Guests see nothing (inbox is
   student-role only, same gate as JoinClassCard).

2. **Teacher surface** = AdminScreen scoped by role:
   - `role='teacher'`: tabs `classes | enroll | scope | progress |
     assignments` filtered to `classes.created_by = auth.uid()`;
     `accounts`/`review` tabs hidden (admin-only).
   - `role='admin'`: unchanged - sees every class + all tabs.
   - New `assignments` tab: create form (class select -> title ->
     grade from class_grade_scopes -> program -> question count
     10/15/20 -> due datetime) then a table per class: title, due,
     `n/m nop`, status; row expands to report.
   - Report panel (ProgressTable style): student rows
     (name, score, time, late flag), completion summary, per-question
     accuracy bars ascending so weakest questions surface first,
     `Giao luyen lai` button seeds a new assignment from the weak
     skill set.

3. **ExamScreen mode='assignment'**: identical to exam mode; header
   shows assignment title + due date instead of program name; result
   screen copy: "Co da nhan bai cua em" - no retry CTA (AC-4.1).

## Architecture (Tech Lead) - v2 after spec review r1

Key simplification: "cung mot de" = **`qb_exam_forms` fixed form** -
existing `fetch_form(p_form_id)` already returns identical canonical
bank questions for every taker, `createExamFromBank({formId})` already
renders them exam-style, and `mode='form'` telemetry already writes
`qb_attempt_events`. No seed machinery needed; q_ids are canonical so
weak-skill analysis joins `qb_questions.skill` natively.

Migration `0043_assignments.sql`:

```sql
-- teacher role (approved ruling)
alter table practice.accounts
  drop constraint accounts_role_check,
  add constraint accounts_role_check check (role in ('admin','student','teacher'));

create table practice.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references practice.classes(id) on delete cascade,
  created_by uuid not null,               -- teacher owner (or admin)
  title text not null,
  form_id text not null references practice.qb_exam_forms(id),
  grade_id text not null,
  program_id text not null,
  opens_at timestamptz not null default now(),
  due_at timestamptz not null,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create table practice.assignment_attempts (
  assignment_id uuid not null references practice.assignments(id) on delete cascade,
  student_id uuid not null references practice.accounts(id),
  started_at timestamptz not null default now(),  -- first take = 'dang lam'
  submitted_at timestamptz,
  score int, total int, time_sec int,
  late boolean not null default false,
  answers jsonb not null default '[]',   -- [{q_id, correct}] - contract below
  primary key (assignment_id, student_id)  -- one attempt row per student
);
-- RLS enabled on both, NO policies = direct access denied;
-- all access via SECURITY DEFINER RPCs with per-RPC authz:
--   role lookup in practice.accounts, enrollment check for students,
--   classes.created_by/admin check for teachers, opens_at/due_at/status
--   checks on take+submit (not only take).
```

`answers` contract: exactly one `{q_id, correct:boolean}` per question
of the form INCLUDING unanswered (correct=false); RPC validates
(a) array length = cardinality(form.questionIds), (b) q_ids are UNIQUE,
(c) the SET of q_ids equals the form's questionIds exactly (rejects
duplicates like [Q1,Q1] that evade length+membership), (d) `correct`
is boolean per entry.

RPCs (security definer, `set search_path = practice`, revoke
PUBLIC/anon/service_role execute + grant authenticated - 0040 pattern):

- `assignment_create(p_class_id, p_title, p_grade_id, p_program_id,
  p_question_count, p_due_at, p_opens_at default now()) -> uuid`
  Authz: caller role teacher+owns class (created_by) OR admin;
  grade must be in class_grade_scopes of that class. Server mints a
  fresh `qb_exam_forms` row (kind='assignment', payload.questionIds =
  random published draw deduped by variant_group AND filtered by
  grade+subject matching program_id) - teacher does NOT pick
  existing forms, so list_assessment_forms stays admin-only and
  form ids are unlisted per-assignment copies.
- `assignments` row also stores `grade_id` + `program_id` copied at
  create so take/report can launch/report without joining the form.
- `assignment_form(p_assignment_id) -> setof jsonb`
  Same row shape as fetch_form. Authz: student enrolled in the
  assignment's class AND assignment open; teacher-owner/admin anytime.
  CR-50 note: students still cannot browse arbitrary forms - they only
  reach a form through an open assignment they are enrolled in.
- `assignment_list(p_class_id) -> table(id,title,form_id,opens_at,
  due_at,status,submitted int,roster int)` - teacher(owner)/admin.
- `assignment_inbox() -> table(assignment_id,title,class_name,
  form_id,opens_at,due_at,state,score,total,late,submitted_at)` -
  student: own enrollments only. state in
  'upcoming'|'open'|'in_progress'|'done'|'late-open'|'closed'.
- `assignment_take(p_assignment_id) -> table(form_id, grade_id,
  program_id, question_count, state)` - student+enrolled only;
  creates (or returns) the attempts row at first take (started_at).
  submitted -> returns state='done', no re-entry (AC-4.1).
  upcoming/closed -> raise. question_count = cardinality(form
  payload.questionIds); grade_id/program_id return the stored
  authoritative values so App launches the right exam config.
- `assignment_submit(p_assignment_id, p_score, p_total, p_time_sec,
  p_answers jsonb, p_snapshot jsonb) -> uuid`
  Re-validates: student role, enrolled, attempt row exists. Atomic
  transition: `UPDATE ... SET submitted_at=now(), ... WHERE
  assignment_id AND student_id AND submitted_at IS NULL` in one
  transaction with the `results` INSERT - returns the new
  results.id; a second submit updates 0 rows -> raise
  already-submitted (no double results row). late = now()>due_at.
- `assignment_remediate(p_assignment_id, p_due_at) -> uuid`
  Authz: same as assignment_create evaluated against the SOURCE
  assignment's class (caller teacher+owner of that class OR admin).
  Mints qb_exam_forms filtered to the source's weakest skills,
  then a new assignment on it - one transaction.
- `assignment_report(p_assignment_id) -> jsonb`
  Owner/admin only. Enrollments LEFT JOIN attempts (roster includes
  non-submitters) + per-question accuracy aggregated from answers
  joined to qb_questions for skill/topic labels + weakest-skills list.
- `assignment_close(p_assignment_id) -> void` - owner/admin.

Teacher class ops (review findings r1.1 + r2.1): policies must not
create an RLS dependency cycle - `classes_student_read` already reads
`enrollments`, so an `enrollments` policy reading `classes` recurses.
Introduce a SECURITY DEFINER helper that bypasses policy evaluation:

```sql
create or replace function practice.owns_class(p_class_id uuid)
returns boolean language sql stable security definer
set search_path = practice as $$
  select exists (
    select 1 from practice.classes
    where id = p_class_id and created_by = auth.uid());
$$;
```

Then teacher policies use the helper (functions evaluate outside RLS
recursion; migration runs as owner so definer bypass applies):
- `classes`: SELECT where `practice.owns_class(id)`;
  INSERT WITH CHECK (role='teacher' AND created_by = auth.uid());
  UPDATE/DELETE where `practice.owns_class(id)`.
- `enrollments`, `class_grade_scopes`: SELECT/INSERT/DELETE where
  `practice.owns_class(class_id)` (teacher manages own roster/scope).
- `accounts`: SELECT student rows via a second SECURITY DEFINER
  helper `teaches_student(p_student_id)` (enrollment in an owned
  class) - report roster shows own students only. Teachers do NOT
  get a school-wide student browser: enrollment is student-driven
  via `join_class_by_code` (join code flow, CR-47) - the enroll tab
  stays admin-only.
Admin keeps existing policies unchanged; helpers get the standard
revoke/grant block.

Client:
- `src/lib/assignments.ts` - typed RPC wrappers (arenaLive pattern).
- `AssignmentsInbox` on grade-select (student role only).
- AdminScreen `assignments` tab + create form + `AssignmentReport`.
- ExamScreen: `mode='assignment'` handled as exam-LIKE (`isExamLike =
  mode==='exam' || mode==='assignment'`) so pacing/verdict match mock.
  Question loading does NOT route through createExamFromBank (its
  fetchBankForm -> fetch_form is admin-only per 0018); instead a new
  `createExamFromAssignment` (in src/lib/qb/bank.ts next to the bank
  loader) calls `assignment_form(assignmentId)`, maps rows through
  the same `toExamQuestion`, and builds the identical ExamState shape
  (count = full questionIds length - never sliced). Telemetry stays
  `mode:'form'` via the existing createExamTelemetry path. On finish:
  calls `assignment_submit` once; the ordinary `saveExamResult` write
  is SUPPRESSED for this mode (submit RPC owns the results row).
  Result screen: "Co da nhan bai cua em" + own score, no retry.
- App.tsx: `assignmentRun {assignmentId, formId, title, dueAt}` state,
  launched from inbox take; role='teacher' routes to AdminScreen.

Weak-skill re-assignment (AC-7.2): report returns weakest
skills (join answers->qb_questions.skill); `assignment_remediate`
(listed above) mints the filtered form + new assignment atomically,
authz on the source class.

Threat notes (STRIDE-lite): form contents are authenticated-readable
(qb_exam_forms select policy) so "đề bí mật trước giờ mở" is NOT
guaranteed - students could list forms. Mitigate: assignment form ids
are unlisted per-assignment copies (minted per create, not in
list_assessment_forms picker results which filters kind='unit-test');
residual risk = guessing uuid ids - accepted for v1, noted. Score
submission is client-trusted (same as every results write today -
deferred).

---

## Implementation review log (post-commit, cross-model lead reviews)

| Round | Findings | Fixed in |
|---|---|---|
| r1 | submit lacked closed-check; answers missing `correct` slipped past NULL-vs-boolean; replay CTA shown | `4e047c9` |
| r2 | `assignment_form` allowed re-entry after submit (AC-4.1) | `8644095` |
| r3 | assignment leaked quest/skill/review side-effects; submit failure silent; teacher saw admin-only enroll tab | `66479d1` |
| r4 | no per-question attempt events (FR-5); AssignPanel stale-class paint; no assignment identity/receipt | `ff6dc40` |
| r5 | stale reload invalidated selected class's read; list reads failed-open (error looked like empty) | `93fd76a` |
| r6 | stale reload still bumped generation before identity check | `ec6d70e` |
| r7 | **APPROVE** | - |

Applied migrations: 0043 (base) + 0044 submit-hardening + 0045 form-guard + 0046 submit-events + 0047 service_role grants on qb_attempt_events.

Final verification: `tsc -b` clean; `vite build` green; Vitest 205 files / 1,719 tests; live smoke `scripts/_assignments-smoke.mjs` 37/37 (provisions 5 users, full lifecycle + denials); Playwright e2e/cr98-assignments.spec.ts self-skips without env creds.

Post-deploy external review (Codex CLI, EXTERNAL-REVIEW-r89.md):
- r-ext1 [major] result-screen exit could orphan an unacknowledged
  submit -> payload now persists in sessionStorage until the server
  acks; re-entering the assignment flushes it before a new sitting.
- r-ext1 [major] createExamFromAssignment silently dropped unrenderable
  rows -> submit would reject 'bad-answers' permanently; load now fails
  loudly (regression test: bank.test.ts).
- r-ext1 [minor] migration 0010 edited in place without grants for the
  new SECURITY DEFINER function -> added the missing EXECUTE grants so
  file replay matches the live DB.
- r-ext1 [minor] AssignPanel selects/datetime lacked accessible names
  -> aria-labels added.

External review round 2 (EXTERNAL-REVIEW-r90.md):
- r-ext2 [major] stored payload keyed only by assignment id - an account
  switch in the same tab could replay student A's answers as student B's
  submission -> payload now carries forUser; mismatched payloads are
  discarded without replay.
- r-ext2 [major] failed flush fell through to a fresh sitting that
  overwrites the unacknowledged payload AND lets the student re-sit a
  form they already saw -> flush failure now BLOCKS re-entry with a
  visible retry until the server acks (or the payload is foreign-owned).
- r-ext2 [minor] drop-guard let an empty form through (0===0) -> rejects
  both empty and partially-unrenderable forms (regression test added).
