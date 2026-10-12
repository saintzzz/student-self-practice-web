grant usage on schema practice to anon;
grant select on practice.qb_item_stats to authenticated;
create or replace function practice.fetch_questions_public(p_grade smallint)
returns setof jsonb language plpgsql as $$
declare
  got int := 0; rec record;
begin
  for rec in select * from practice.qb_questions where random() < 0.35 limit 10 loop
    got := got + 1; return next to_jsonb(rec);
  end loop;
  if got < 10 then
    for rec in select * from practice.qb_questions limit 10 - got loop
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
alter table practice.qb_verify_todo enable row level security;
alter table practice.qb_verify_verdicts enable row level security;
alter table practice.qa_tokens enable row level security;
