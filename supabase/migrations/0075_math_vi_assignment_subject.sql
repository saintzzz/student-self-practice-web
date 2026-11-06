-- CR-128 r175-1: assignment_create + assignment_remediate mapped the
-- program->subject case without 'math-vi', so a Toán tiếng Việt
-- assignment would mint its form from the English bank. Both paths now
-- pass the program id through when it is a bank subject itself.

create or replace function practice.assignment_create(
  p_class_id uuid, p_title text, p_grade_id text, p_program_id text,
  p_question_count integer, p_due_at timestamptz, p_opens_at timestamptz default now()
) returns uuid
language plpgsql security definer
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
  v_subject := case when p_program_id in ('math', 'math-vi', 'science') then p_program_id
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

create or replace function practice.assignment_remediate(
  p_assignment_id uuid, p_due_at timestamptz, p_opens_at timestamptz default now()
) returns uuid
language plpgsql security definer
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
  v_subject := case when a.program_id in ('math', 'math-vi', 'science') then a.program_id
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
