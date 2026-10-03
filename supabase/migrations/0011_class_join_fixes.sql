-- CR-47 review fixes (round 1):
-- 1) gen_join_code must be callable by `authenticated` - it is the
--    column DEFAULT and Postgres evaluates defaults as the inserting
--    user, so admin class creation broke under the 0010 revoke. Made
--    SECURITY DEFINER so its collision check always sees every class
--    regardless of the caller's RLS view.
-- 2) join_class_by_code enforces one-class-per-student (ruling: a code
--    is the class's enrollment entitlement; switching classes is an
--    admin action). Re-entering the SAME code stays idempotent.
-- 3) Tighten the format check to the actual alphabet (no I/L/O).
-- 4) Bounded collision loop - never spin forever.

create or replace function practice.gen_join_code()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  for attempt in 1..20 loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    if not exists (select 1 from practice.classes c where c.join_code = code) then
      return code;
    end if;
  end loop;
  raise exception 'join code space exhausted';
end;
$$;

grant execute on function practice.gen_join_code() to authenticated;

alter table practice.classes drop constraint classes_join_code_format;
alter table practice.classes
  add constraint classes_join_code_format
  check (join_code ~ '^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$');

create or replace function practice.join_class_by_code(p_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
  v_class record;
  v_existing uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  select a.role into v_role from practice.accounts a where a.id = v_uid;
  if v_role is null or v_role <> 'student' then
    raise exception 'only students can join a class';
  end if;
  select c.id, c.name into v_class from practice.classes c
    where c.join_code = upper(btrim(p_code));
  if not found then
    raise exception 'class code not found';
  end if;
  select e.class_id into v_existing from practice.enrollments e
    where e.student_id = v_uid limit 1;
  if found and v_existing <> v_class.id then
    raise exception 'already enrolled in a class';
  end if;
  insert into practice.enrollments (class_id, student_id)
  values (v_class.id, v_uid)
  on conflict do nothing;
  return v_class.name;
end;
$$;
