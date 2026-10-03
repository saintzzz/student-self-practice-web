-- CR-47 review round 2 fixes:
-- 1) Race: two simultaneous joins (two tabs / scripted calls) could both
--    pass the "no enrollment" check and enroll the student in two
--    classes. Lock the student's accounts row first so joins for the
--    same student serialize (a unique index on enrollments.student_id
--    is NOT used - admins may still legitimately multi-enroll).
-- 2) Oracle: code lookup ran before the enrollment check, so an
--    already-enrolled student could probe whether a code was real via
--    the different error messages. Now an enrolled student gets the
--    same 'already enrolled' for any code that is not their own class -
--    valid or not.
-- 3) The previous `limit 1` enrollment check could raise for the wrong
--    class when an admin had multi-enrolled a student. Replaced with
--    exists-based checks.

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
  -- serialize joins for this student (row lock held to txn end)
  perform 1 from practice.accounts a where a.id = v_uid for update;
  select c.id, c.name into v_class from practice.classes c
    where c.join_code = upper(btrim(p_code));
  -- one class per student: an enrolled student may only re-enter a
  -- code of a class they already belong to. Any other input - a code
  -- for another class or an invalid code - returns the same error so
  -- the response cannot be used to probe valid codes.
  if exists (select 1 from practice.enrollments e where e.student_id = v_uid)
     and (v_class.id is null
          or not exists (select 1 from practice.enrollments e
                          where e.student_id = v_uid and e.class_id = v_class.id)) then
    raise exception 'already enrolled in a class';
  end if;
  if v_class.id is null then
    raise exception 'class code not found';
  end if;
  insert into practice.enrollments (class_id, student_id)
  values (v_class.id, v_uid)
  on conflict do nothing;
  return v_class.name;
end;
$$;
