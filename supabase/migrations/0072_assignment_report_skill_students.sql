-- CR-125: teacher trouble groups - extend assignment_report with a
-- per-student x per-skill cross-tab so the report can show "em nao yeu
-- ky nang nao" (IXL trouble spots). Same data the questions block
-- already scans (submitted attempts' answers joined to qb_questions),
-- just grouped by (student, skill) instead of question.
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
      ) qq),
    'skill_students', (
      select coalesce(jsonb_agg(row_to_json(ss) order by ss.accuracy asc, ss.skill, ss.student_name), '[]'::jsonb)
      from (
        select q.skill, t.student_id, acc.display_name as student_name,
               sum(case when ans.correct then 1 else 0 end) as correct,
               count(*) as total,
               avg((ans.correct)::int) as accuracy
        from practice.assignment_attempts t
        cross join lateral (
          select v.value->>'q_id' as q_id, (v.value->>'correct')::boolean as correct
          from jsonb_array_elements(t.answers) v
        ) ans
        join practice.qb_questions q on q.id = ans.q_id
        join practice.accounts acc on acc.id = t.student_id
        where t.assignment_id = a.id and t.submitted_at is not null
        group by q.skill, t.student_id, acc.display_name
      ) ss)
  );
end;
$$;
