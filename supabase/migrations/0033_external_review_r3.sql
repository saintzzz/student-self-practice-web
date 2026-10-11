-- EXTERNAL-REVIEW-r3 fixes
-- 1. Shared rate-limit storage for edge functions (per-isolate Map could be
--    bypassed by isolates/restarts). check_rate_limit() is atomic upsert.
-- 2. fetch_questions: revoke default PUBLIC/anon execute - authenticated only.
-- 3. qb_* select policies: answer keys (choices, answer) are readable by any
--    authenticated user via direct table access - restrict to admins. Serving
--    goes through security-definer RPCs which bypass RLS anyway.
-- 4. review_question 'approve' now clears requiresHumanApprovalForExam and
--    requiresHumanApprovalForCommercialRelease - approval is the human
--    signoff transition, so the serving gates below actually let approved
--    rows through.
-- 5. Publication gates made real:
--    - practice (free/beta surface): practiceEligible
--    - mock / exam (commercial surfaces): also require the corresponding
--      requiresHumanApproval flag to be cleared by review_question approve.
--    Content not yet human-approved cannot serve in mock/exam mode.
-- 6. fetch functions: prefilter with random() < fraction so ORDER BY random()
--    does not sort the whole matching pool every call.
-- 7. record_attempt_events: skip malformed elements (bad uuid / grade)
--    instead of aborting the whole batch.

-- ---------- 1. shared rate limit ----------
create table if not exists practice.rate_limits (
  bucket text primary key,
  window_start timestamptz not null,
  count int not null
);
alter table practice.rate_limits enable row level security;
revoke all on practice.rate_limits from public, anon, authenticated;

-- Returns remaining quota; -1 when over limit. Atomic upsert so concurrent
-- callers cannot race past the cap.
create or replace function practice.check_rate_limit(
  p_bucket text,
  p_max int,
  p_window_seconds int
)
returns int
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  v_count int;
  v_start timestamptz;
begin
  insert into practice.rate_limits (bucket, window_start, count)
  values (p_bucket, now(), 1)
  on conflict (bucket) do update
    set count = case
        when practice.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
        else practice.rate_limits.count + 1
      end,
      window_start = case
        when practice.rate_limits.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
        else practice.rate_limits.window_start
      end
  returning count, window_start into v_count, v_start;

  if v_count > p_max then
    return -1;
  end if;
  return p_max - v_count;
end;
$$;
revoke all on function practice.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function practice.check_rate_limit(text, int, int) to service_role;

-- ---------- 2. fetch_questions: authenticated only ----------
revoke execute on function practice.fetch_questions(smallint, text, int, text, text[], smallint)
  from public, anon;
revoke execute on function practice.fetch_questions_public(smallint, text, int, text[], smallint)
  from public;
grant execute on function practice.fetch_questions(smallint, text, int, text, text[], smallint)
  to service_role;
grant execute on function practice.fetch_questions_public(smallint, text, int, text[], smallint)
  to service_role;

-- ---------- 3. direct table reads: admin only ----------
drop policy if exists qb_questions_select on practice.qb_questions;
drop policy if exists qb_exam_forms_select on practice.qb_exam_forms;
drop policy if exists qb_exam_blueprints_select on practice.qb_exam_blueprints;
drop policy if exists qb_review_queue_select on practice.qb_review_queue;

create policy qb_questions_admin_select on practice.qb_questions
  for select to authenticated using (practice.is_admin());
create policy qb_exam_forms_admin_select on practice.qb_exam_forms
  for select to authenticated using (practice.is_admin());
create policy qb_exam_blueprints_admin_select on practice.qb_exam_blueprints
  for select to authenticated using (practice.is_admin());
create policy qb_review_queue_admin_select on practice.qb_review_queue
  for select to authenticated using (practice.is_admin());
-- asset/link rows carry no answer keys - keep readable for admin-driven
-- tooling, but question content itself now requires admin.

-- ---------- 4. approval transition clears human-approval flags ----------
create or replace function practice.review_question(
  p_question_id text,
  p_action text,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  new_status text;
  reason text := btrim(coalesce(p_reason, ''));
begin
  if not practice.is_admin() then
    raise exception 'admin only';
  end if;
  if p_action not in ('approve','reject','flag') then
    raise exception 'unknown action %', p_action;
  end if;
  if p_action in ('reject','flag') and reason = '' then
    raise exception 'reason required for %', p_action;
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

  if p_action <> 'flag' then
    update practice.qb_questions
      set review_status = new_status,
          publication_policy = case when p_action = 'approve'
            -- human signoff: clear BOTH approval gates so serving works
            then publication_policy ||
              '{"examEligible": true, "requiresHumanApprovalForExam": false, "requiresHumanApprovalForCommercialRelease": false}'::jsonb
            else publication_policy ||
              '{"examEligible": false, "practiceEligible": false, "mockEligible": false}'::jsonb
          end
      where id = p_question_id;
  else
    update practice.qb_questions
      set review_status = new_status
      where id = p_question_id;
  end if;

  insert into practice.qb_review_events (question_id, action, reason, actor_id)
    values (p_question_id, p_action, reason, auth.uid());
  insert into practice.audit_log (actor_id, action, entity, entity_id, detail)
    values (auth.uid(), 'review_' || p_action, 'qb_questions', p_question_id,
            jsonb_build_object('reason', reason, 'status', new_status));

  return jsonb_build_object('questionId', p_question_id, 'status', new_status);
end;
$$;
revoke all on function practice.review_question(text, text, text) from public, anon;
grant execute on function practice.review_question(text, text, text) to authenticated;

-- ---------- 5+6. fetch functions: approval gates + bounded sampling ----------
create or replace function practice.fetch_questions_public(
  p_grade smallint,
  p_subject text,
  p_count int default 20,
  p_skills text[] default null,
  p_min_difficulty smallint default null
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
      and (p_skills is null or q.skill = any(p_skills))
      and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
      and question_type not in ('constructed-response', 'speaking-prompt')
      and (q.publication_policy->>'practiceEligible')::boolean
      and (q.publication_policy->>'commercialReleaseEligible')::boolean
      and q.review_status not in ('rejected', 'draft')
      -- prefilter: bound the ORDER BY random() sort to ~35% of the pool
      and random() < 0.35
    order by coalesce(q.variant_group_id, q.id), random()
  ) t
  order by random()
  limit greatest(1, least(p_count, 200));
$$;
revoke all on function practice.fetch_questions_public(smallint, text, int, text[], smallint) from public;
grant execute on function practice.fetch_questions_public(smallint, text, int, text[], smallint) to anon, authenticated, service_role;

create or replace function practice.fetch_questions(
  p_grade smallint,
  p_subject text,
  p_count int default 20,
  p_mode text default 'practice',
  p_skills text[] default null,
  p_min_difficulty smallint default null
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
      and (p_skills is null or q.skill = any(p_skills))
      and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
      and q.review_status not in ('rejected', 'draft')
      and case when p_mode = 'exam'
            -- exam: human approval must have cleared the exam flag
            then (q.publication_policy->>'examEligible')::boolean
               and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
            when p_mode = 'mock'
            -- mock (thi thu) is the commercial surface: also require the
            -- commercial-release flag cleared by human approval
            then (q.publication_policy->>'mockEligible')::boolean
               and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
            else (q.publication_policy->>'practiceEligible')::boolean
          end
      and random() < 0.35
    order by coalesce(q.variant_group_id, q.id), random()
  ) t
  order by random()
  limit greatest(1, least(p_count, 200));
$$;
revoke all on function practice.fetch_questions(smallint, text, int, text, text[], smallint)
  from public, anon;
grant execute on function practice.fetch_questions(smallint, text, int, text, text[], smallint)
  to authenticated, service_role;

-- ---------- 7. telemetry: skip malformed elements ----------
create or replace function practice.record_attempt_events(p_events jsonb)
returns int
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  inserted int;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;
  if jsonb_array_length(p_events) > 200 then
    raise exception 'event batch too large (max 200)';
  end if;

  insert into practice.qb_attempt_events
    (client_event_id, learner_id, question_id, program_id, grade, mode,
     form_id, is_correct, latency_ms, session_id, answered_at)
  select
    (e->>'client_event_id')::uuid,
    auth.uid(),
    e->>'question_id',
    e->>'program_id',
    (e->>'grade')::smallint,
    e->>'mode',
    nullif(e->>'form_id',''),
    (e->>'is_correct')::boolean,
    nullif(e->>'latency_ms','')::int,
    e->>'session_id',
    coalesce((e->>'answered_at')::timestamptz, now())
  from jsonb_array_elements(p_events) e
  where e->>'client_event_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and e->>'grade' ~ '^[1-5]$'
    and e->>'question_id' is not null
  on conflict (client_event_id) do nothing;

  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
revoke all on function practice.record_attempt_events(jsonb) from public, anon;
grant execute on function practice.record_attempt_events(jsonb) to authenticated, service_role;
