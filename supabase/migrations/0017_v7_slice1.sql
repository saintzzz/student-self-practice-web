-- CR-49 / V7 slice 1 - Assessment Intelligence nen tang.
-- 1) qb_attempt_events: immutable per-answer events (nen mastery +
--    item statistics sau). Append-only, idempotent qua client_event_id.
-- 2) qb_item_stats: view aggregate facility rate hien trong review UI.
-- 3) qb_adaptive_decisions: shadow-mode log - ghi "adaptive se chon gi"
--    NHUNG khong anh huong selection toi khi co pilot data.
-- 4) practice.audit_log: audit chung cho privileged ops; review_question
--    gio ghi them audit row.
-- 5) results.form_id + results.question_snapshot: assessment snapshot -
--    replay/re-grade dung dung bo cau da thi.

create table if not exists practice.qb_attempt_events (
  id bigint generated always as identity primary key,
  client_event_id uuid not null unique,
  learner_id uuid not null references auth.users(id),
  question_id text not null,
  program_id text not null,
  grade smallint not null,
  mode text not null check (mode in ('practice','mock','form','arena','review','batch')),
  form_id text,
  is_correct boolean not null,
  latency_ms int check (latency_ms is null or latency_ms >= 0),
  session_id text not null,
  answered_at timestamptz not null default now()
);
create index if not exists qb_attempt_events_learner on practice.qb_attempt_events(learner_id, answered_at desc);
create index if not exists qb_attempt_events_question on practice.qb_attempt_events(question_id);

alter table practice.qb_attempt_events enable row level security;
create policy qb_attempt_events_admin_select on practice.qb_attempt_events
  for select to authenticated using (practice.is_admin());
create policy qb_attempt_events_self_select on practice.qb_attempt_events
  for select to authenticated using (learner_id = auth.uid());
-- Khong insert/update/delete truc tiep - chi qua record_attempt_events.

-- Batch record, idempotent: client_event_id trung thi bo qua.
create or replace function practice.record_attempt_events(p_events jsonb)
returns int
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  inserted int;
begin
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
  on conflict (client_event_id) do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
revoke all on function practice.record_attempt_events(jsonb) from public, anon;
grant execute on function practice.record_attempt_events(jsonb) to authenticated;

-- Item statistics tu du lieu that (khong suy dien - chi facility).
create or replace view practice.qb_item_stats
with (security_invoker = true) as
select question_id,
       count(*)::int as attempts,
       count(distinct learner_id)::int as learners,
       round(avg(is_correct::int)::numeric, 3) as facility,
       round(avg(latency_ms)::numeric, 0) as avg_latency_ms,
       max(answered_at) as last_attempt_at
from practice.qb_attempt_events
group by question_id;

-- Adaptive shadow log (V7 - explainable, no false precision).
create table if not exists practice.qb_adaptive_decisions (
  id bigint generated always as identity primary key,
  learner_id uuid not null references auth.users(id),
  session_id text not null,
  program_id text not null,
  grade smallint not null,
  rolling_accuracy numeric(4,3),
  recommended_difficulty smallint,
  rationale text not null,
  shadow boolean not null default true,
  created_at timestamptz not null default now()
);
alter table practice.qb_adaptive_decisions enable row level security;
create policy qb_adaptive_decisions_admin_select on practice.qb_adaptive_decisions
  for select to authenticated using (practice.is_admin());

create or replace function practice.log_adaptive_decision(
  p_session_id text, p_program_id text, p_grade smallint,
  p_rolling_accuracy numeric, p_recommended_difficulty smallint,
  p_rationale text
) returns void
language plpgsql security definer
set search_path = practice, pg_catalog
as $$
begin
  insert into practice.qb_adaptive_decisions
    (learner_id, session_id, program_id, grade, rolling_accuracy,
     recommended_difficulty, rationale)
  values (auth.uid(), p_session_id, p_program_id, p_grade,
          p_rolling_accuracy, p_recommended_difficulty, p_rationale);
end;
$$;
revoke all on function practice.log_adaptive_decision(text,text,smallint,numeric,smallint,text) from public, anon;
grant execute on function practice.log_adaptive_decision(text,text,smallint,numeric,smallint,text) to authenticated;

-- Audit log chung cho privileged ops.
create table if not exists practice.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  action text not null,
  entity text not null,
  entity_id text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table practice.audit_log enable row level security;
create policy audit_log_admin_select on practice.audit_log
  for select to authenticated using (practice.is_admin());

-- review_question: ghi audit_log ben canh qb_review_events.
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
            then publication_policy || '{"examEligible": true}'::jsonb
            else publication_policy || '{"examEligible": false, "practiceEligible": false, "mockEligible": false}'::jsonb
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

-- Assessment snapshot tren results: replay dung bo cau da thi.
alter table practice.results
  add column if not exists form_id text,
  add column if not exists question_snapshot jsonb;
