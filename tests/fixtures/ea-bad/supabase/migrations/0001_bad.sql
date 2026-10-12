create or replace function practice.fetch_questions_public(p_grade smallint)
returns setof jsonb language plpgsql as $$
declare
  rec record;
  seen text[] := '{}';
begin
  for rec in select * from practice.qb_questions where random() < 0.35 limit 10 loop
    seen := seen || rec.id;
    return next to_jsonb(rec);
  end loop;
  for rec in select * from practice.qb_questions where not (id = any(seen)) limit 10 loop
    return next to_jsonb(rec);
  end loop;
end;
$$;
create or replace function practice.record_attempt_events(p_events jsonb)
returns void language plpgsql as $$
begin
  insert into practice.qb_attempt_events select * from jsonb_populate_recordset(null::practice.qb_attempt_events, p_events);
end;
$$;
alter table practice.qb_attempt_events
  add constraint qb_attempt_events_learner_id_fkey
  foreign key (learner_id) references auth.users(id);
alter table practice.phantom_table enable row level security;

-- r6 bad classes: unverified recipients + raw display_name in outbound mail
create table if not exists practice.parent_contacts (account_id uuid, email text, opted_in boolean);
create or replace function practice.send_weekly_reports()
returns int language plpgsql as $$
declare v_row record;
begin
  for v_row in
    select pc.email, a.display_name
    from practice.parent_contacts pc
    join practice.accounts a on a.id = pc.account_id
    where pc.opted_in
  loop
    raise notice '%', 'Report for ' || v_row.display_name;
  end loop;
  return 0;
end;
$$;

-- r7 bad classes
-- 31: column-level revoke while the table grant stands
revoke update (verified) on practice.parent_contacts from authenticated;
-- 32: status write with no expected-status predicate
create or replace function practice.review_question(p_question_id text)
returns jsonb language plpgsql as $$
begin
  update practice.qb_review_queue
    set review_status = 'approved'
    where question_id = p_question_id;
  return jsonb_build_object('ok', true);
end;
$$;
-- 34: mailer posts to a provider directly
create or replace function practice.send_email(p_to text)
returns bigint language plpgsql as $$
begin
  return 1;
end;
$$;
create or replace function practice.request_parent_verify()
returns jsonb language plpgsql as $$
begin
  perform net.http_post(url := 'https://api.resend.com/emails');
  return jsonb_build_object('ok', true);
end;
$$;
-- 35: return type changed without drop (defined twice, second different)
create or replace function practice.get_ai_configs() returns int language sql as $$ select 1 $$;
