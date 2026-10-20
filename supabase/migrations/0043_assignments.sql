-- CR-98: class assignments - teacher issues one fixed form to a class;
-- every enrolled student takes the SAME qb_exam_forms question set,
-- one attempt, graded, reported per-assignment, weak skills feed a
-- remediation assignment.
--
-- Security model (same as 0040): both new tables are RLS-enabled with
-- NO policies -> direct access denied; all access goes through
-- SECURITY DEFINER RPCs that re-check role/enrollment/ownership inside.
-- Teacher-scoped table policies use SECURITY DEFINER helpers
-- (owns_class / teaches_student) to avoid policy-evaluation cycles
-- (classes_student_read already reads enrollments).

-- ---------- 0. teacher role ----------
alter table practice.accounts
  drop constraint if exists accounts_role_check;
alter table practice.accounts
  add constraint accounts_role_check check (role in ('admin', 'student', 'teacher'));

create or replace function practice.is_teacher()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from practice.accounts a
    where a.id = (select auth.uid()) and a.role = 'teacher'
  );
$$;

-- Owner-side helpers - evaluated as the function owner (migration
-- role owns the practice tables) so they bypass RLS and cannot
-- recurse through the policies that call them.
create or replace function practice.owns_class(p_class_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from practice.classes c
    where c.id = p_class_id and c.created_by = (select auth.uid()));
$$;

create or replace function practice.teaches_student(p_student_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from practice.enrollments e
    join practice.classes c on c.id = e.class_id
    where e.student_id = p_student_id
      and c.created_by = (select auth.uid()));
$$;

create or replace function practice.enrolled_in_class(p_class_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from practice.enrollments e
    where e.class_id = p_class_id
      and e.student_id = (select auth.uid()));
$$;

create or replace function practice.is_student()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from practice.accounts a
    where a.id = (select auth.uid()) and a.role = 'student'
  );
$$;

-- ---------- 1. tables ----------
create table if not exists practice.assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references practice.classes(id) on delete cascade,
  created_by uuid not null,
  title text not null,
  form_id text not null references practice.qb_exam_forms(id),
  grade_id text not null,
  program_id text not null,
  opens_at timestamptz not null default now(),
  due_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_assignments_class on practice.assignments(class_id);

create table if not exists practice.assignment_attempts (
  assignment_id uuid not null references practice.assignments(id) on delete cascade,
  student_id uuid not null references practice.accounts(id),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  results_id uuid references practice.results(id),
  score int,
  total int,
  time_sec int,
  late boolean not null default false,
  answers jsonb not null default '[]'::jsonb,
  primary key (assignment_id, student_id)
);
create index if not exists idx_assignment_attempts_student
  on practice.assignment_attempts(student_id);

alter table practice.assignments enable row level security;
alter table practice.assignment_attempts enable row level security;
-- No policies: default deny for direct access (RPC-only).

revoke all on practice.assignments from anon, authenticated, service_role;
revoke all on practice.assignment_attempts from anon, authenticated, service_role;
grant all on practice.assignments to service_role;
grant all on practice.assignment_attempts to service_role;

-- ---------- 2. teacher-scoped policies on existing tables ----------
create policy classes_teacher_select on practice.classes
  for select to authenticated
  using (practice.owns_class(id));
create policy classes_teacher_insert on practice.classes
  for insert to authenticated
  with check (practice.is_teacher() and created_by = (select auth.uid()));
create policy classes_teacher_update on practice.classes
  for update to authenticated
  using (practice.owns_class(id))
  with check (practice.owns_class(id));
create policy classes_teacher_delete on practice.classes
  for delete to authenticated
  using (practice.owns_class(id));

create policy enrollments_teacher_all on practice.enrollments
  for all to authenticated
  using (practice.owns_class(class_id))
  with check (practice.owns_class(class_id));

create policy scopes_teacher_all on practice.class_grade_scopes
  for all to authenticated
  using (practice.owns_class(class_id))
  with check (practice.owns_class(class_id));

create policy accounts_teacher_read on practice.accounts
  for select to authenticated
  using (practice.teaches_student(id));

create policy results_teacher_read on practice.results
  for select to authenticated
  using (practice.teaches_student(account_id));

-- ---------- 3. form minting helper ----------
-- Draw a published, auto-scoreable question set identical to the
-- fetch_questions 'mock' pool (examEligible is the human-approved V6
-- assessment tier - a teacher quiz draws the graded mock pool) and mint
-- it as a qb_exam_forms row. Returns the new form id.
create or replace function practice._assignment_mint_form(
  p_grade smallint,
  p_subject text,
  p_count int,
  p_skills text[] default null
)
returns text
language plpgsql
volatile
security definer
set search_path = practice, pg_catalog
as $$
declare
  v_form_id text := 'asg-' || gen_random_uuid()::text;
  v_ids text[];
begin
  select array_agg(t.id order by t.ord) into v_ids
  from (
    select q.id, row_number() over (order by random()) as ord
    from (
      select distinct on (coalesce(q2.variant_group_id, q2.id)) q2.*
      from practice.qb_questions q2
      where q2.grade = p_grade
        and q2.subject = p_subject
        and q2.canonical
        and (p_skills is null or q2.skill = any(p_skills))
        and q2.question_type not in ('constructed-response', 'speaking-prompt')
        and q2.review_status not in ('rejected', 'draft')
        and (q2.publication_policy->>'commercialReleaseEligible')::boolean
        and (q2.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
        and (q2.publication_policy->>'mockEligible')::boolean
        and (q2.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
      order by coalesce(q2.variant_group_id, q2.id), random()
    ) q
    order by random()
    limit p_count
  ) t;
  if v_ids is null or array_length(v_ids, 1) < 1 then
    raise exception 'no-eligible-questions';
  end if;
  insert into practice.qb_exam_forms (id, blueprint_id, grade, subject, kind, mode, payload)
  values (
    v_form_id, null, p_grade, p_subject, 'assignment', 'mock',
    jsonb_build_object('questionIds', to_jsonb(v_ids), 'totalQuestions', array_length(v_ids, 1))
  );
  return v_form_id;
end;
$$;

-- ---------- 4. RPCs ----------
create or replace function practice.assignment_create(
  p_class_id uuid,
  p_title text,
  p_grade_id text,
  p_program_id text,
  p_question_count int,
  p_due_at timestamptz,
  p_opens_at timestamptz default now()
)
returns uuid
language plpgsql
volatile
security definer
set search_path = practice, pg_catalog
as $$
declare
  v_id uuid := gen_random_uuid();
  v_form text;
  v_grade smallint;
  v_subject text;
  v_count int := greatest(1, least(coalesce(p_question_count, 10), 50));
begin
  if not (practice.is_admin() or (practice.is_teacher() and practice.owns_class(p_class_id))) then
    raise exception 'not-owner';
  end if;
  if not exists (
    select 1 from practice.class_grade_scopes s
    where s.class_id = p_class_id and s.grade_id = p_grade_id
  ) then
    raise exception 'grade-out-of-scope';
  end if;
  v_grade := nullif(regexp_replace(p_grade_id, '\D', '', 'g'), '')::smallint;
  v_subject := case when p_program_id = 'math' then 'math'
                    when p_program_id = 'science' then 'science'
                    else 'english' end;
  v_form := practice._assignment_mint_form(v_grade, v_subject, v_count);
  insert into practice.assignments
    (id, class_id, created_by, title, form_id, grade_id, program_id, opens_at, due_at)
  values
    (v_id, p_class_id, auth.uid(), coalesce(nullif(trim(p_title), ''), 'Bài tập'),
     v_form, p_grade_id, p_program_id, p_opens_at, p_due_at);
  return v_id;
end;
$$;

create or replace function practice.assignment_list(p_class_id uuid)
returns table(
  id uuid, title text, form_id text, grade_id text, program_id text,
  opens_at timestamptz, due_at timestamptz, status text,
  submitted bigint, started bigint, roster bigint
)
language sql stable
security definer
set search_path = practice, pg_catalog
as $$
  select a.id, a.title, a.form_id, a.grade_id, a.program_id,
         a.opens_at, a.due_at, a.status,
         (select count(*) from practice.assignment_attempts att
           where att.assignment_id = a.id and att.submitted_at is not null) as submitted,
         (select count(*) from practice.assignment_attempts att
           where att.assignment_id = a.id and att.submitted_at is null) as started,
         (select count(*) from practice.enrollments e
           where e.class_id = a.class_id) as roster
  from practice.assignments a
  where a.class_id = p_class_id
    and (practice.is_admin() or (practice.is_teacher() and practice.owns_class(a.class_id)))
  order by a.due_at desc;
$$;

create or replace function practice.assignment_inbox()
returns table(
  assignment_id uuid, title text, class_name text, form_id text,
  grade_id text, program_id text, opens_at timestamptz, due_at timestamptz,
  state text, score int, total int, late boolean, submitted_at timestamptz
)
language sql stable
security definer
set search_path = practice, pg_catalog
as $$
  select a.id, a.title, c.name, a.form_id, a.grade_id, a.program_id,
         a.opens_at, a.due_at,
         case
           when at2.submitted_at is not null then 'done'
           when a.status = 'closed' then 'closed'
           when now() < a.opens_at then 'upcoming'
           when at2.started_at is not null then 'in_progress'
           when now() > a.due_at then 'late-open'
           else 'open'
         end as state,
         at2.score, at2.total, at2.late, at2.submitted_at
  from practice.assignments a
  join practice.classes c on c.id = a.class_id
  join practice.enrollments e on e.class_id = a.class_id
                            and e.student_id = (select auth.uid())
  left join practice.assignment_attempts at2
         on at2.assignment_id = a.id and at2.student_id = (select auth.uid())
  where practice.is_student()
  order by a.due_at asc;
$$;

create or replace function practice.assignment_take(p_assignment_id uuid)
returns table(
  form_id text, grade_id text, program_id text, question_count int, state text
)
language plpgsql
volatile
security definer
set search_path = practice, pg_catalog
as $$
declare
  a practice.assignments;
  v_submitted timestamptz;
begin
  if not practice.is_student() then raise exception 'not-student'; end if;
  select * into a from practice.assignments where id = p_assignment_id;
  if not found then raise exception 'not-found'; end if;
  if not practice.enrolled_in_class(a.class_id) then raise exception 'not-enrolled'; end if;
  select submitted_at into v_submitted
    from practice.assignment_attempts
   where assignment_id = a.id and student_id = (select auth.uid());
  if v_submitted is not null then
    return query select a.form_id, a.grade_id, a.program_id, 0, 'done';
    return;
  end if;
  if a.status <> 'open' then raise exception 'closed'; end if;
  if now() < a.opens_at then raise exception 'upcoming'; end if;
  insert into practice.assignment_attempts (assignment_id, student_id)
  values (a.id, (select auth.uid()))
  on conflict (assignment_id, student_id) do nothing;
  return query
    select a.form_id, a.grade_id, a.program_id,
           jsonb_array_length(f.payload->'questionIds'),
           'open'
  from practice.qb_exam_forms f where f.id = a.form_id;
end;
$$;

-- Same row shape as fetch_form, gated by assignment enrollment/open -
-- students reach a form only through an assignment they belong to.
create or replace function practice.assignment_form(p_assignment_id uuid)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = practice, pg_catalog
as $$
declare
  a practice.assignments;
begin
  select * into a from practice.assignments where id = p_assignment_id;
  if not found then raise exception 'not-found'; end if;
  if practice.is_admin() or (practice.is_teacher() and practice.owns_class(a.class_id)) then
    null; -- staff may preview
  elsif practice.is_student()
        and practice.enrolled_in_class(a.class_id)
        and a.status = 'open'
        and now() >= a.opens_at
        and not exists (
          select 1 from practice.assignment_attempts att
           where att.assignment_id = a.id
             and att.student_id = (select auth.uid())
             and att.submitted_at is not null) then
    null; -- enrolled student during the window, not yet submitted
  else
    raise exception 'forbidden';
  end if;
  return query
    select to_jsonb(q.*) || jsonb_build_object(
      'asset_paths', coalesce((
        select jsonb_agg(ast.file_path order by qa.sort_order)
        from practice.qb_question_assets qa
        join practice.qb_assets ast on ast.id = qa.asset_id
        where qa.question_id = q.id), '[]'::jsonb),
      'audio_transcripts', coalesce((
        select jsonb_agg(aa.transcript)
        from practice.qb_question_audio qau
        join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
        where qau.question_id = q.id), '[]'::jsonb))
    from practice.qb_exam_forms f
    cross join lateral jsonb_array_elements_text(f.payload->'questionIds')
         with ordinality as ids(qid, ord)
    join practice.qb_questions q on q.id = ids.qid
    where f.id = a.form_id
    order by ids.ord;
end;
$$;

create or replace function practice.assignment_submit(
  p_assignment_id uuid,
  p_score int,
  p_total int,
  p_time_sec int,
  p_answers jsonb,
  p_snapshot jsonb default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = practice, pg_catalog
as $$
declare
  a practice.assignments;
  v_form_ids text[];
  v_ans_ids text[];
  v_count int;
  v_correct int;
  v_rid uuid;
begin
  if not practice.is_student() then raise exception 'not-student'; end if;
  select * into a from practice.assignments where id = p_assignment_id for update;
  if not found then raise exception 'not-found'; end if;
  if not practice.enrolled_in_class(a.class_id) then raise exception 'not-enrolled'; end if;
  -- Spec: window checks on take AND submit - a closed assignment stops
  -- accepting even in-flight attempts.
  if a.status <> 'open' then raise exception 'closed'; end if;

  -- answers contract: unique q_ids + exact set equality with the form.
  -- `is distinct from` catches missing keys: jsonb_typeof(missing) is
  -- NULL and NULL <> 'boolean' is NULL, which a plain <> filter misses.
  select array_agg(x.value->>'q_id'),
         count(*) filter (where
           jsonb_typeof(x.value) <> 'object'
           or x.value->>'q_id' is null
           or jsonb_typeof(x.value->'correct') is distinct from 'boolean'),
         count(*) filter (where
           case when jsonb_typeof(x.value->'correct') = 'boolean'
                then (x.value->>'correct')::boolean else false end)
      into v_ans_ids, v_count, v_correct
    from jsonb_array_elements(p_answers) x;
  if v_count is null or v_count > 0 then raise exception 'bad-answers'; end if;
  select array_agg(t) into v_form_ids
    from jsonb_array_elements_text(
      (select payload->'questionIds' from practice.qb_exam_forms where id = a.form_id)) t;
  if v_ans_ids is null
     or (select count(distinct x) from unnest(v_ans_ids) x) <> coalesce(array_length(v_ans_ids, 1), 0)
     or not (coalesce(v_ans_ids <@ v_form_ids, false) and coalesce(v_form_ids <@ v_ans_ids, false)) then
    raise exception 'bad-answers';
  end if;

  update practice.assignment_attempts t
     set submitted_at = now(), score = p_score, total = p_total,
         time_sec = p_time_sec, late = now() > a.due_at, answers = p_answers
   where t.assignment_id = a.id and t.student_id = (select auth.uid())
     and t.submitted_at is null;
  if not found then raise exception 'already-submitted'; end if;

  insert into practice.results
    (account_id, grade_id, program, form_id, points, max_points,
     correct_count, total_questions, rounds_completed, time_used_sec, question_snapshot)
  values (
    (select auth.uid()), a.grade_id, a.program_id, 'assignment:' || a.id::text,
    p_score, p_total, v_correct, coalesce(array_length(v_form_ids, 1), 0), 1, p_time_sec,
    coalesce(p_snapshot, '{}'::jsonb))
  returning id into v_rid;

  -- Per-question telemetry lands atomically with the submission: every
  -- form question gets an event (unanswered count as wrong in p_answers),
  -- linked via the assignment's own form_id. The client disables its
  -- telemetry for assignment mode so events have a single writer.
  insert into practice.qb_attempt_events
    (client_event_id, learner_id, question_id, program_id, grade, mode,
     form_id, is_correct, latency_ms, session_id, answered_at)
  select gen_random_uuid(), (select auth.uid()), x.value->>'q_id',
         a.program_id,
         nullif(regexp_replace(a.grade_id, '\D', '', 'g'), '')::smallint,
         'form', a.form_id, (x.value->>'correct')::boolean, null,
         'asg:' || a.id::text || ':' || (select auth.uid())::text, now()
    from jsonb_array_elements(p_answers) x
  on conflict (client_event_id) do nothing;

  update practice.assignment_attempts t set results_id = v_rid
   where t.assignment_id = a.id and t.student_id = (select auth.uid());
  return v_rid;
end;
$$;

create or replace function practice.assignment_report(p_assignment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = practice, pg_catalog
as $$
declare
  a practice.assignments;
begin
  select * into a from practice.assignments where id = p_assignment_id;
  if not found then raise exception 'not-found'; end if;
  if not (practice.is_admin() or (practice.is_teacher() and practice.owns_class(a.class_id))) then
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'assignment', to_jsonb(a),
    'roster', (
      select coalesce(jsonb_agg(row_to_json(r) order by r.student_name), '[]'::jsonb)
      from (
        select acc.display_name as student_name, acc.id as student_id,
               at.started_at, at.submitted_at, at.score, at.total, at.time_sec, at.late
        from practice.enrollments e
        join practice.accounts acc on acc.id = e.student_id
        left join practice.assignment_attempts at
          on at.assignment_id = a.id and at.student_id = e.student_id
        where e.class_id = a.class_id
      ) r),
    'questions', (
      select coalesce(jsonb_agg(row_to_json(qq) order by qq.accuracy asc), '[]'::jsonb)
      from (
        select ans.q_id, q.skill, q.topic_key,
               avg((ans.correct)::int) as accuracy,
               count(*) as attempts
        from practice.assignment_attempts t
        cross join lateral (
          select v.value->>'q_id' as q_id, (v.value->>'correct')::boolean as correct
          from jsonb_array_elements(t.answers) v
        ) ans
        join practice.qb_questions q on q.id = ans.q_id
        where t.assignment_id = a.id and t.submitted_at is not null
        group by ans.q_id, q.skill, q.topic_key
      ) qq)
  );
end;
$$;

create or replace function practice.assignment_close(p_assignment_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = practice, pg_catalog
as $$
declare
  a practice.assignments;
begin
  select * into a from practice.assignments where id = p_assignment_id;
  if not found then raise exception 'not-found'; end if;
  if not (practice.is_admin() or (practice.is_teacher() and practice.owns_class(a.class_id))) then
    raise exception 'forbidden';
  end if;
  update practice.assignments set status = 'closed' where id = a.id;
end;
$$;

-- Remediate: weakest skills of the source assignment -> new filtered
-- form -> new assignment on the same class. One transaction.
create or replace function practice.assignment_remediate(
  p_assignment_id uuid,
  p_due_at timestamptz,
  p_opens_at timestamptz default now()
)
returns uuid
language plpgsql
volatile
security definer
set search_path = practice, pg_catalog
as $$
declare
  a practice.assignments;
  v_skills text[];
  v_form text;
  v_grade smallint;
  v_subject text;
  v_id uuid := gen_random_uuid();
  v_count int;
begin
  select * into a from practice.assignments where id = p_assignment_id;
  if not found then raise exception 'not-found'; end if;
  if not (practice.is_admin() or (practice.is_teacher() and practice.owns_class(a.class_id))) then
    raise exception 'forbidden';
  end if;
  -- weakest half of attempted skills (<=60% accuracy), capped at 4
  select array_agg(skill order by accuracy asc) into v_skills
  from (
    select q.skill, avg((ans.correct)::int) as accuracy
    from practice.assignment_attempts t
    cross join lateral (
      select v.value->>'q_id' as q_id, (v.value->>'correct')::boolean as correct
      from jsonb_array_elements(t.answers) v) ans
    join practice.qb_questions q on q.id = ans.q_id
    where t.assignment_id = a.id and t.submitted_at is not null
    group by q.skill
    having avg((ans.correct)::int) <= 0.6
    order by accuracy asc
    limit 4) w;
  if v_skills is null then raise exception 'no-weak-skills'; end if;
  v_grade := nullif(regexp_replace(a.grade_id, '\D', '', 'g'), '')::smallint;
  v_subject := case when a.program_id = 'math' then 'math'
                    when a.program_id = 'science' then 'science'
                    else 'english' end;
  select jsonb_array_length(payload->'questionIds') into v_count
    from practice.qb_exam_forms where id = a.form_id;
  v_form := practice._assignment_mint_form(v_grade, v_subject, coalesce(v_count, 10), v_skills);
  insert into practice.assignments
    (id, class_id, created_by, title, form_id, grade_id, program_id, opens_at, due_at)
  values
    (v_id, a.class_id, auth.uid(), a.title || ' (luyện lại)', v_form,
     a.grade_id, a.program_id, p_opens_at, p_due_at);
  return v_id;
end;
$$;

-- ---------- 5. grants (0040 convention) ----------
do $$
declare fn record;
begin
  for fn in
    select p.proname as name
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'practice'
      and (p.proname like 'assignment\_%'
           or p.proname in ('owns_class','teaches_student','enrolled_in_class','is_teacher','is_student'))
  loop
    execute format('revoke all on function practice.%I from public, anon', fn.name);
    execute format('revoke execute on function practice.%I from service_role', fn.name);
    execute format('grant execute on function practice.%I to authenticated', fn.name);
  end loop;
end$$;
revoke all on function practice._assignment_mint_form(smallint, text, int, text[]) from public, anon, authenticated;
grant execute on function practice._assignment_mint_form(smallint, text, int, text[]) to service_role;
