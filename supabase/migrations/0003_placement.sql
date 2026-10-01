-- CR-23: placement diagnostic - luu lop goi y tren account.
-- set_my_placement la security definer chi update dung 1 cot,
-- tranh mo self-update toan bo row accounts (username/role).

alter table practice.accounts
  add column if not exists placement_grade text
  check (placement_grade is null or placement_grade in
    ('grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5'));

create or replace function practice.set_my_placement(g text)
returns void
language plpgsql
security definer
set search_path = 'practice', 'public'
as $$
begin
  if g not in ('grade-1','grade-2','grade-3','grade-4','grade-5') then
    raise exception 'invalid grade %', g;
  end if;
  update practice.accounts
    set placement_grade = g
    where id = auth.uid();
end;
$$;

revoke all on function practice.set_my_placement(text) from public;
grant execute on function practice.set_my_placement(text) to authenticated;
