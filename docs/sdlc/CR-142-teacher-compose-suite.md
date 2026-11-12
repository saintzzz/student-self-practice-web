# CR-142: Teacher compose suite - manual pick, custom questions, exam matrix

## Driver

PO directive (user, 2026-11-12): "soạn bài - tạo bài - tạo đề thi -
giao cho lớp hay học sinh". Audit confirmed the pipeline exists but
only as auto-generation: `assignment_create(classId, grade, program,
count, due)` draws a random set from the shared bank. The gaps for a
sellable teacher product:

- **Manual pick**: browse the bank, hand-select specific questions.
- **Custom questions**: teacher authors their own items (their school's
  tests must not leak into the shared public bank).
- **Exam matrix**: structured đề thi with named sections
  (Nghe/Đọc/Viết, or school-specific), not a flat question count.
- **Per-student targeting**: assign to individuals/small groups, not
  only the whole class (remediate already proves the loop shape).

Delivery, grading, reporting, and the take-flow already exist (CR-98)
and are reused unchanged.

## Scope

1. **Assignment itemization (foundation for everything below).**
   - `practice.assignment_items` (or a `question_ids uuid[]` column on
     `assignments` - Tech Lead decides): explicit ordered item list
     instead of seed-only generation. `assignment_take` returns the
     explicit list when present, falls back to seed otherwise.
   - `assignment_create` gains an optional `p_question_ids` path: same
     RPC contract, new validation (all ids exist, grade/program match,
     teacher may access the bank scope).

2. **Manual picker UI (teacher Assign tab).**
   - Filter: grade, program, skill, question type, text search.
   - Preview card per question (stem + options + answer hidden), multi-
     select with running count, "create assignment from N selected".
   - Reuses existing question-bank read paths; no new tables.

3. **Teacher-authored questions.**
   - `practice.teacher_questions`: owner_uid, school scope, same
     columns as the shared bank (type, prompt, options, answer,
     explanation, grade, program, skill, optional media).
   - RLS: only owner (and admin audit) can read; students see items
     ONLY through `assignment_take` payloads - never direct select.
   - Authoring UI: minimal form (type picker, stem, 2-4 options, mark
     correct, grade/program/skill tags, optional image/audio upload to
     a teacher-scoped storage prefix).
   - Quality gate: light self-check (all fields present, exactly one
     correct option) - no bank-style review workflow, these are the
     teacher's own responsibility.
   - Picker (item 2) gains a "Câu hỏi của tôi" source toggle mixing
     bank + teacher items.

4. **Exam matrix builder.**
   - Named sections: free-form section list, each with title +
     question ids (from picker) OR auto-fill rule (grade/skill/count).
   - Per-section optional time hint + instructions text shown to the
     student before that section.
   - Preview mode renders the take-flow as the teacher sees it before
     assigning.
   - Stored as ordered sections on the assignment (jsonb column or
     child table - Tech Lead decides).

5. **Per-student / subgroup assign.**
   - `assignment_targets`: roster checkboxes instead of whole-class
     default; empty = whole class (current behavior preserved).
   - `assignment_inbox` already filters by enrollment - extend to also
     honor the target list.

## Impact assessment

- **Data model:** `teacher_questions` table + `assignment_items` (or
  ids column) + `assignment_targets` + sections storage - ~1 migration
  `NNNN_teacher_compose.sql`. Shared bank untouched. RPCs extended
  (`assignment_create` overload, `assignment_take` explicit-list path,
  `teacher_question_*` CRUD) - all SECURITY DEFINER (CR-97/98 pattern).
- **Client:** AdminScreen Assign tab becomes a compose workspace
  (picker, matrix, preview); small authoring modal. Student take-flow
  untouched except reading explicit items.
- **Content safety:** teacher items never enter the public bank or the
  review queue; suppression/quarantine paths don't apply.
- **Risks:** seed-vs-explicit dual path in take/submit must keep the
  one-attempt + replay invariants (CR-98 review rounds) - regression
  tests around payload owner-tagging and re-entry blocking.

## Acceptance criteria

- Teacher builds a 3-section đề (2 auto-fill + 1 hand-picked) and
  assigns to 5 of 30 students; only those 5 see the inbox item.
- Take/submit/report behave identically to current assignments
  (same screens, same report rows) for explicit-item exams.
- Teacher-authored question appears only to its owner and to students
  through the take payload; RLS denies any direct read by others.
- One-attempt and replay-guard invariants hold (CR-98 r-ext tests).

## Estimate

~2-3 weeks equivalent (schema+RPCs, picker/matrix UI, authoring form,
RLS + replay regression tests, Playwright teacher flow).
