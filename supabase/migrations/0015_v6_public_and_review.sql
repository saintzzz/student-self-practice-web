-- CR-48 Phase 4/5:
-- 1) fetch_questions_public - guest-safe practice fetch (SECURITY
--    DEFINER, chi cho practiceEligible; anon khong cham mock pool).
-- 2) list_assessment_forms - forms picker cho logged-in student.
-- 3) review_question - admin xu ly academic review queue
--    (V7-AR): approve -> review_status approved + examEligible=true
--    (human signoff), reject -> rejected, flag -> flagged.

create or replace function practice.fetch_questions_public(
  p_grade smallint,
  p_subject text,
  p_count int default 20
)
returns setof jsonb
language sql stable
security definer
set search_path = practice, pg_catalog
as $$
  select to_jsonb(t.*) || jsonb_build_object(
    'asset_paths', coalesce((
      select jsonb_agg(a.file_path order by qa.sort_order)
      from practice.qb_question_assets qa
      join practice.qb_assets a on a.id = qa.asset_id
      where qa.question_id = t.id), '[]'::jsonb),
    'audio_transcripts', coalesce((
      select jsonb_agg(aa.transcript)
      from practice.qb_question_audio qau
      join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
      where qau.question_id = t.id), '[]'::jsonb))
  from (
    select distinct on (coalesce(q.variant_group_id, q.id)) q.*
    from practice.qb_questions q
    where q.grade = p_grade
      and q.subject = p_subject
      and q.canonical
      and question_type not in ('constructed-response', 'speaking-prompt')
      and (q.publication_policy->>'practiceEligible')::boolean
      and (q.publication_policy->>'commercialReleaseEligible')::boolean
    order by coalesce(q.variant_group_id, q.id), random()
  ) t
  order by random()
  limit p_count;
$$;

revoke all on function practice.fetch_questions_public(smallint, text, int) from public;
grant execute on function practice.fetch_questions_public(smallint, text, int) to anon, authenticated;

-- Form picker: id, kind, title (unitTitle tu metadata), so cau.
create or replace function practice.list_assessment_forms(
  p_grade smallint,
  p_subject text default null
)
returns table(id text, kind text, grade smallint, subject text, title text, total_questions int)
language sql stable
security invoker
as $$
  select f.id, f.kind, f.grade, f.subject,
         coalesce(f.payload->'metadata'->>'unitTitle', f.kind) as title,
         coalesce((f.payload->>'totalQuestions')::int, jsonb_array_length(f.payload->'questionIds')) as total_questions
  from practice.qb_exam_forms f
  where f.grade = p_grade
    and (p_subject is null or f.subject = p_subject)
  order by f.kind, f.id;
$$;

grant execute on function practice.list_assessment_forms(smallint, text) to authenticated;

-- Academic review action (V7-AR-001 lifecycle). Admin only.
create or replace function practice.review_question(
  p_question_id text,
  p_action text  -- 'approve' | 'reject' | 'flag'
)
returns jsonb
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  new_status text;
begin
  if not practice.is_admin() then
    raise exception 'admin only';
  end if;
  if p_action not in ('approve','reject','flag') then
    raise exception 'unknown action %', p_action;
  end if;
  new_status := case p_action
    when 'approve' then 'approved'
    when 'reject' then 'rejected'
    else 'flagged' end;

  update practice.qb_review_queue
    set review_status = new_status,
        reviewer_id = auth.uid(),
        reviewed_at = now()
    where question_id = p_question_id;

  -- Eligibility only changes on a decision: approve grants the
  -- human signoff examEligible needs; reject pulls the item from all
  -- pools. flag marks for follow-up without changing pools.
  if p_action <> 'flag' then
    update practice.qb_questions
      set review_status = new_status,
          publication_policy = case when p_action = 'approve'
            then publication_policy || '{"examEligible": true}'::jsonb
            else publication_policy || '{"examEligible": false, "practiceEligible": false, "mockEligible": false}'::jsonb
          end
      where id = p_question_id;
  else
    update practice.qb_questions
      set review_status = new_status
      where id = p_question_id;
  end if;

  return jsonb_build_object('questionId', p_question_id, 'status', new_status);
end;
$$;

revoke all on function practice.review_question(text, text) from public, anon;
grant execute on function practice.review_question(text, text) to authenticated;
