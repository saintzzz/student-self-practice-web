-- CR-50: bo de chuan hoa la cong cu giao vien - hoc sinh khong duoc
-- doc form (cau hoi + answer key ro la cheat vector). Security definer
-- de chu duroc RLS tren qb_* cho admin ma khong mo rong quyen student.

create or replace function practice.list_assessment_forms(
  p_grade smallint,
  p_subject text default null
)
returns table(id text, kind text, grade smallint, subject text, title text, total_questions int)
language sql stable
security definer
set search_path = practice, pg_catalog
as $$
  select f.id, f.kind, f.grade, f.subject,
         coalesce(f.payload->'metadata'->>'unitTitle', f.kind) as title,
         coalesce((f.payload->>'totalQuestions')::int, jsonb_array_length(f.payload->'questionIds')) as total_questions
  from practice.qb_exam_forms f
  where practice.is_admin()
    and f.grade = p_grade
    and (p_subject is null or f.subject = p_subject)
  order by f.kind, f.id;
$$;

create or replace function practice.fetch_form(p_form_id text)
returns setof jsonb
language sql stable
security definer
set search_path = practice, pg_catalog
as $$
  select to_jsonb(q.*) || jsonb_build_object(
    'asset_paths', coalesce((
      select jsonb_agg(a.file_path order by qa.sort_order)
      from practice.qb_question_assets qa
      join practice.qb_assets a on a.id = qa.asset_id
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
  where practice.is_admin()
    and f.id = p_form_id
  order by ids.ord;
$$;
