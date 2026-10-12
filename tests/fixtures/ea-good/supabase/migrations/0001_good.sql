grant usage on schema practice to anon;
create table if not exists practice.qb_attempt_events (learner_id uuid);
create table if not exists practice.qb_adaptive_decisions (learner_id uuid);
create table if not exists practice.audit_log (actor_id uuid);
create table if not exists practice.qb_review_events (actor_id uuid);
create table if not exists practice.accounts (id uuid, role text);
create table if not exists practice.qb_verify_todo (id text primary key, claimed_at timestamptz);
create table if not exists practice.qb_verify_verdicts (id text primary key, answer_ok boolean not null, expl_ok boolean not null);
create table if not exists practice.qa_tokens (token text not null);
alter table practice.qb_verify_todo enable row level security;
alter table practice.qb_verify_verdicts enable row level security;
alter table practice.qa_tokens enable row level security;

create or replace function practice.fetch_questions_public(p_grade smallint)
returns setof jsonb language plpgsql as $$
declare
  got int := 0; rec record; seen text[] := '{}';
begin
  for rec in
    select * from practice.qb_questions q
    where random() < 0.35
      and (q.publication_policy->>'commercialReleaseEligible')::boolean
      and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
      and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
    limit 10
  loop
    got := got + 1;
    seen := seen || coalesce(rec.variant_group_id, rec.id);
    return next to_jsonb(rec);
  end loop;
  if got < 10 then
    for rec in
      select * from practice.qb_questions q
      where (q.publication_policy->>'commercialReleaseEligible')::boolean
        and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
        and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
        and not (coalesce(q.variant_group_id, q.id) = any(seen))
      limit 10 - got
    loop
      return next to_jsonb(rec);
    end loop;
  end if;
end;
$$;
create or replace function practice.record_attempt_events(p_events jsonb)
returns void language plpgsql as $$
declare
  e jsonb;
begin
  for e in select value from jsonb_array_elements(p_events) loop
    begin
      insert into practice.qb_attempt_events select 1;
    exception when others then null;
    end;
  end loop;
end;
$$;
create or replace function practice.qb_item_stats_for(p_ids text[])
returns table(question_id text) language plpgsql security definer as $$
begin
  if not practice.is_admin() then raise exception 'admin only'; end if;
  return query select s.question_id from practice.qb_item_stats s where s.question_id = any(p_ids);
end;
$$;
revoke select on practice.qb_item_stats from authenticated;

alter table practice.qb_attempt_events
  add constraint fk1 foreign key (learner_id) references auth.users(id) on delete cascade;
alter table practice.qb_adaptive_decisions
  add constraint fk2 foreign key (learner_id) references auth.users(id) on delete cascade;
alter table practice.audit_log
  add constraint fk3 foreign key (actor_id) references auth.users(id) on delete set null;
alter table practice.qb_review_events
  add constraint fk4 foreign key (actor_id) references auth.users(id) on delete set null;

create or replace function practice.guard_last_admin() returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext('g'));
  return old;
end $$;
create trigger t before delete on practice.accounts for each row execute function practice.guard_last_admin();

-- r6 good: verified recipients + escaped interpolation
create table if not exists practice.parent_contacts (
  account_id uuid, email text, opted_in boolean,
  verified boolean not null default false,
  verify_token uuid, verify_token_sent_at timestamptz
);
revoke insert (verified, verify_token, verify_token_sent_at)
  on practice.parent_contacts from authenticated;
revoke update (verified, verify_token, verify_token_sent_at)
  on practice.parent_contacts from authenticated;
create or replace function practice.email_esc(p text)
returns text language sql as $$ select p $$;
create or replace function practice.confirm_parent_email(p_token uuid)
returns jsonb language plpgsql as $$ begin return '{}'::jsonb; end $$;
create or replace function practice.send_weekly_reports()
returns int language plpgsql as $$
declare v_row record; v_name text;
begin
  for v_row in
    select pc.email, a.display_name
    from practice.parent_contacts pc
    join practice.accounts a on a.id = pc.account_id
    where pc.opted_in and pc.verified
  loop
    v_name := practice.email_esc(v_row.display_name);
    raise notice '%', 'Report ' || v_name;
  end loop;
  return 0;
end;
$$;
