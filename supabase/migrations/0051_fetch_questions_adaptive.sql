-- CR-107 (0051): adaptive difficulty fetch - ZPD-biased variant of
-- fetch_questions for authenticated practice rounds.
--
-- Shape mirrors the 0044/0049 hardening: a revoked __impl doing the
-- row work behind a thin public wrapper that stacks per-IP + per-uid
-- rate limits, all rows still pass strip_bank_row (the CR-102 moat is
-- untouched). Guests keep fetch_questions_public - there is no
-- learner history to adapt on.
--
-- Model (documented in docs/sdlc/CR-107-adaptive-difficulty.md):
--   per-skill proficiency = correct-rate over the caller's last 30
--   qb_attempt_events for that skill (joined via question_id);
--   <10 outcomes -> baseline target 3. ZPD map: <0.5 -> 2 (ease),
--   0.5-0.85 -> 3 (consolidate), >=0.85 -> 4 (stretch; d5 supply is
--   too thin to target). Selection prefers in-band then nearest -
--   count under-fill is impossible while eligible rows exist because
--   ordering is a preference, not a filter.

create or replace function practice.fetch_questions_adaptive__impl(
  p_grade smallint,
  p_subject text,
  p_count int default 20,
  p_skills text[] default null,
  p_min_difficulty smallint default null,
  p_mode text default 'practice'
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = practice, pg_catalog
as $$
declare
  n int := greatest(1, least(p_count, 200));
  rec record;
begin
  for rec in
    with last_outcomes as (
      select q2.skill, e.is_correct,
             row_number() over (partition by q2.skill
                                order by e.answered_at desc) as rn
      from practice.qb_attempt_events e
      join practice.qb_questions q2 on q2.id = e.question_id
      where e.learner_id = auth.uid()
    ),
    target as (
      select skill,
             case
               when count(*) < 10 then 3
               when avg(is_correct::int) < 0.5 then 2
               when avg(is_correct::int) >= 0.85 then 4
               else 3
             end as zpd_target
      from last_outcomes
      where rn <= 30
      group by skill
    ),
    pool as (
      -- Per variant-group keep the variant closest to the learner's
      -- target difficulty (random tiebreak), same dedup rule as
      -- fetch_questions__impl.
      select distinct on (coalesce(q.variant_group_id, q.id))
             q.*, coalesce(t.zpd_target, 3) as zpd_target
      from practice.qb_questions q
      left join target t on t.skill = q.skill
      where q.grade = p_grade
        and q.subject = p_subject
        and q.canonical
        and (p_skills is null or q.skill = any(p_skills))
        and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
        and question_type not in ('constructed-response', 'speaking-prompt')
        and q.review_status not in ('rejected', 'draft')
        and (q.publication_policy->>'commercialReleaseEligible')::boolean
        and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
        and case when p_mode = 'exam'
              then (q.publication_policy->>'examEligible')::boolean
                 and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
              when p_mode = 'mock'
              then (q.publication_policy->>'mockEligible')::boolean
                 and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
              else (q.publication_policy->>'practiceEligible')::boolean
            end
      order by coalesce(q.variant_group_id, q.id),
               abs(q.difficulty - coalesce(t.zpd_target, 3)),
               random()
    )
    select * from pool
    order by (abs(pool.difficulty - pool.zpd_target) > 1),
             abs(pool.difficulty - pool.zpd_target),
             random()
    limit n
  loop
    -- zpd_target is internal - strip it, then attach the same
    -- asset/transcript enrichment fetch_questions__impl emits.
    return next (to_jsonb(rec) - 'zpd_target') || jsonb_build_object(
      'asset_paths', coalesce((
        select jsonb_agg(a.file_path order by qa.sort_order)
        from practice.qb_question_assets qa
        join practice.qb_assets a on a.id = qa.asset_id
        where qa.question_id = rec.id), '[]'::jsonb),
      'audio_transcripts', coalesce((
        select jsonb_agg(aa.transcript)
        from practice.qb_question_audio qau
        join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
        where qau.question_id = rec.id), '[]'::jsonb));
  end loop;
  return;
end;
$$;

revoke all on function practice.fetch_questions_adaptive__impl(smallint, text, int, text[], smallint, text)
  from public, anon, authenticated;

-- Public wrapper - verbatim cap stack from 0049 fetch_questions plus
-- strip_bank_row. service_role bypasses student caps only; rows are
-- still keyless. Authenticated only (adaptive needs learner history).
create or replace function practice.fetch_questions_adaptive(
  p_grade smallint, p_subject text, p_count integer default 20,
  p_skills text[] default null::text[], p_min_difficulty smallint default null::smallint,
  p_mode text default 'practice'::text
)
returns setof jsonb
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  v_uid text := coalesce(auth.uid()::text, 'anon');
  v_ip text := practice.client_ip();
  v_rows int := greatest(1, least(p_count, 200));
begin
  if auth.role() = 'service_role' then
    return query
      select practice.strip_bank_row(j)
      from practice.fetch_questions_adaptive__impl(
        p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j;
    return;
  end if;
  -- r104: charge the SHARED fq_* buckets, not a parallel fqa_* set -
  -- separate buckets would let a caller exhaust the adaptive allowance
  -- and re-draw through fetch_questions, doubling the aggregate cap
  -- the 0049 anti-splitting design put in place.
  if v_ip is not null
     and (practice.check_rate_limit('fq_ip_calls:' || v_ip, 100, 3600) < 0
       or practice.check_rate_limit_weighted('fq_ip_rows:' || v_ip, v_rows, 3000, 3600) < 0) then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  if practice.check_rate_limit('fq_uid_calls:' || v_uid, 60, 3600) < 0
     or practice.check_rate_limit_weighted('fq_uid_rows:' || v_uid, v_rows, 4000, 3600) < 0 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;
  return query
    select practice.strip_bank_row(j)
    from practice.fetch_questions_adaptive__impl(
      p_grade, p_subject, p_count, p_skills, p_min_difficulty, p_mode) j;
end;
$$;

revoke all on function practice.fetch_questions_adaptive(smallint, text, integer, text[], smallint, text)
  from public, anon;
grant execute on function practice.fetch_questions_adaptive(smallint, text, integer, text[], smallint, text)
  to authenticated, service_role;
