-- CR-47: class join code - students self-enroll via a 6-char code the
-- teacher shares. Default-deny stays: the join RPC is SECURITY DEFINER
-- and enforces the student role inside; nothing new is readable.

-- 6 chars from an unambiguous alphabet (no 0/O, 1/I/L) - ~887M combos.
create or replace function practice.gen_join_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code text;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from practice.classes c where c.join_code = code);
  end loop;
  return code;
end;
$$;

alter table practice.classes add column if not exists join_code text;

update practice.classes set join_code = practice.gen_join_code() where join_code is null;

alter table practice.classes alter column join_code set not null;
alter table practice.classes alter column join_code set default practice.gen_join_code();
alter table practice.classes
  add constraint classes_join_code_format check (join_code ~ '^[A-Z2-9]{6}$');
create unique index if not exists classes_join_code_idx on practice.classes (join_code);

-- Students call this to enroll themselves. SECURITY DEFINER so it can
-- write enrollments despite students having no insert grant - the role
-- check inside is the guard, not the policy.
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
  insert into practice.enrollments (class_id, student_id)
  values (v_class.id, v_uid)
  on conflict do nothing;
  return v_class.name;
end;
$$;

revoke all on function practice.gen_join_code() from public, anon, authenticated, service_role;
revoke all on function practice.join_class_by_code(text) from public, anon;
revoke execute on function practice.join_class_by_code(text) from service_role;
grant execute on function practice.join_class_by_code(text) to authenticated;
