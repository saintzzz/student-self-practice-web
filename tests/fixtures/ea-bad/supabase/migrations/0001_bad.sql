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
