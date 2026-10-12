-- EXTERNAL-REVIEW-r5 fixes
-- 1. fetch_questions (authenticated): gate parity with fetch_questions_public.
--    The mock branch checked requiresHumanApprovalForCommercialRelease but
--    not requiresHumanApprovalForExam, and neither branch required
--    commercialReleaseEligible - an authenticated mock fetch could serve
--    content the public surface would withhold.
-- 2. Two-pass sampling: `seen` tracked raw ids only, so a sibling in the
--    same variant_group_id could return twice (once per pass).
-- 3. qb_item_stats: security_invoker view over qb_attempt_events made the
--    authenticated SELECT grant useless (underlying table denied). Replace
--    direct view reads with an admin-checked SECURITY DEFINER RPC.
-- 4. Account deletion: learner_id/actor_id FKs to auth.users blocked
--    deleteUser. Telemetry cascades (disposable); audit/review actor ids
--    anonymize via ON DELETE SET NULL.
-- 5. Last-admin guard raced under concurrent deletes. A trigger holding an
--    advisory transaction lock serializes the check in the DB.

-- ---------- 1+2. fetch_questions: gate parity + variant-group dedupe ----------
-- A pre-r4 overload with a different parameter order survived on the
-- deployed DB and carried NO gates - drop it so only the gated
-- signature remains callable.
drop function if exists practice.fetch_questions(smallint, text, integer, text, text[], smallint);
create or replace function practice.fetch_questions(
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
  got int := 0;
  seen text[] := '{}';
  rec record;
begin
  for rec in
    select t.* from (
      select distinct on (coalesce(q.variant_group_id, q.id)) q.*
      from practice.qb_questions q
      where q.grade = p_grade
        and q.subject = p_subject
        and q.canonical
        and (p_skills is null or q.skill = any(p_skills))
        and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
        and question_type not in ('constructed-response', 'speaking-prompt')
        and q.review_status not in ('rejected', 'draft')
        and (q.publication_policy->>'commercialReleaseEligible')::boolean
        and case when p_mode = 'exam'
              then (q.publication_policy->>'examEligible')::boolean
                 and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
              when p_mode = 'mock'
              then (q.publication_policy->>'mockEligible')::boolean
                 and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
                 and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
              else (q.publication_policy->>'practiceEligible')::boolean
            end
        and random() < 0.35
      order by coalesce(q.variant_group_id, q.id), random()
    ) t
    order by random()
    limit n
  loop
    got := got + 1;
    seen := seen || coalesce(rec.variant_group_id, rec.id);
    return next to_jsonb(rec) || jsonb_build_object(
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

  if got < n then
    for rec in
      select t.* from (
        select distinct on (coalesce(q.variant_group_id, q.id)) q.*
        from practice.qb_questions q
        where q.grade = p_grade
          and q.subject = p_subject
          and q.canonical
          and (p_skills is null or q.skill = any(p_skills))
          and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
          and question_type not in ('constructed-response', 'speaking-prompt')
          and q.review_status not in ('rejected', 'draft')
          and (q.publication_policy->>'commercialReleaseEligible')::boolean
          and case when p_mode = 'exam'
                then (q.publication_policy->>'examEligible')::boolean
                   and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
                when p_mode = 'mock'
                then (q.publication_policy->>'mockEligible')::boolean
                   and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
                   and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
                else (q.publication_policy->>'practiceEligible')::boolean
              end
          and not (coalesce(q.variant_group_id, q.id) = any(seen))
        order by coalesce(q.variant_group_id, q.id), random()
      ) t
      order by random()
      limit n - got
    loop
      return next to_jsonb(rec) || jsonb_build_object(
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
  end if;
  return;
end;
$$;
revoke all on function practice.fetch_questions(smallint, text, int, text[], smallint, text) from public, anon;
grant execute on function practice.fetch_questions(smallint, text, int, text[], smallint, text) to authenticated, service_role;

-- ---------- 2b. fetch_questions_public: same variant-group dedupe ----------
create or replace function practice.fetch_questions_public(
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
  got int := 0;
  seen text[] := '{}';
  rec record;
begin
  for rec in
    select t.* from (
      select distinct on (coalesce(q.variant_group_id, q.id)) q.*
      from practice.qb_questions q
      where q.grade = p_grade
        and q.subject = p_subject
        and q.canonical
        and (p_skills is null or q.skill = any(p_skills))
        and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
        and question_type not in ('constructed-response', 'speaking-prompt')
        and q.review_status not in ('rejected', 'draft')
        and (q.publication_policy->>'commercialReleaseEligible')::boolean
        and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
        and case when p_mode in ('mock','exam')
              then (q.publication_policy->>'mockEligible')::boolean
                 and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
              else (q.publication_policy->>'practiceEligible')::boolean
            end
        and random() < 0.35
      order by coalesce(q.variant_group_id, q.id), random()
    ) t
    order by random()
    limit n
  loop
    got := got + 1;
    seen := seen || coalesce(rec.variant_group_id, rec.id);
    return next to_jsonb(rec) || jsonb_build_object(
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

  if got < n then
    for rec in
      select t.* from (
        select distinct on (coalesce(q.variant_group_id, q.id)) q.*
        from practice.qb_questions q
        where q.grade = p_grade
          and q.subject = p_subject
          and q.canonical
          and (p_skills is null or q.skill = any(p_skills))
          and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
          and question_type not in ('constructed-response', 'speaking-prompt')
          and q.review_status not in ('rejected', 'draft')
          and (q.publication_policy->>'commercialReleaseEligible')::boolean
          and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
          and case when p_mode in ('mock','exam')
                then (q.publication_policy->>'mockEligible')::boolean
                   and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
                else (q.publication_policy->>'practiceEligible')::boolean
              end
          and not (coalesce(q.variant_group_id, q.id) = any(seen))
        order by coalesce(q.variant_group_id, q.id), random()
      ) t
      order by random()
      limit n - got
    loop
      return next to_jsonb(rec) || jsonb_build_object(
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
  end if;
  return;
end;
$$;
revoke all on function practice.fetch_questions_public(smallint, text, int, text[], smallint, text) from public;
grant execute on function practice.fetch_questions_public(smallint, text, int, text[], smallint, text) to anon, authenticated, service_role;

-- ---------- 3. item stats via admin-checked RPC, not an invoker view ----------
create or replace function practice.qb_item_stats_for(p_ids text[])
returns table(question_id text, attempts int, learners int, facility numeric)
language plpgsql
stable
security definer
set search_path = practice, pg_catalog
as $$
begin
  -- service_role REST calls bypass PostgREST grants but still hit this
  -- guard; auth.uid() is null for them so is_admin() alone would deny.
  if coalesce(auth.jwt() ->> 'role','') <> 'service_role' and not practice.is_admin() then
    raise exception 'admin only';
  end if;
  return query
    select s.question_id, s.attempts, s.learners, s.facility
    from practice.qb_item_stats s
    where s.question_id = any(p_ids);
end;
$$;
revoke all on function practice.qb_item_stats_for(text[]) from public, anon;
grant execute on function practice.qb_item_stats_for(text[]) to authenticated, service_role;
-- direct view select is no longer needed by the client.
revoke select on practice.qb_item_stats from authenticated;

-- ---------- 4. deletion semantics ----------
-- telemetry is disposable: cascade with the user.
alter table practice.qb_attempt_events
  drop constraint qb_attempt_events_learner_id_fkey,
  add constraint qb_attempt_events_learner_id_fkey
    foreign key (learner_id) references auth.users(id) on delete cascade;
alter table practice.qb_adaptive_decisions
  drop constraint qb_adaptive_decisions_learner_id_fkey,
  add constraint qb_adaptive_decisions_learner_id_fkey
    foreign key (learner_id) references auth.users(id) on delete cascade;
-- audit/review history is retained but anonymized.
alter table practice.audit_log
  alter column actor_id drop not null,
  drop constraint audit_log_actor_id_fkey,
  add constraint audit_log_actor_id_fkey
    foreign key (actor_id) references auth.users(id) on delete set null;
alter table practice.qb_review_events
  alter column actor_id drop not null,
  drop constraint qb_review_events_actor_id_fkey,
  add constraint qb_review_events_actor_id_fkey
    foreign key (actor_id) references auth.users(id) on delete set null;

-- ---------- 5. last-admin invariant in the DB ----------
-- auth.users delete cascades to practice.accounts; an advisory xact lock
-- serializes concurrent deletions so two admins cannot race past the guard.
create or replace function practice.guard_last_admin()
returns trigger
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
begin
  if old.role = 'admin' then
    perform pg_advisory_xact_lock(hashtext('practice_last_admin_guard'));
    if (select count(*) from practice.accounts where role = 'admin' and id <> old.id) = 0 then
      raise exception 'cannot delete the last admin account';
    end if;
  end if;
  return old;
end;
$$;
drop trigger if exists accounts_guard_last_admin on practice.accounts;
create trigger accounts_guard_last_admin
  before delete on practice.accounts
  for each row execute function practice.guard_last_admin();
