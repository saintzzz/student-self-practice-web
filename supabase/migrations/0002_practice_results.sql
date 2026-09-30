-- practice.results: ket qua tung batch luyen tap cua hoc sinh.
-- Nen tang cho bao cao tien do (admin xem theo lop) va trang ca nhan hoc sinh.
-- Default-deny nhu cac bang khac: RLS bat buoc, grant toi thieu.

create table practice.results (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references practice.accounts(id) on delete cascade,
  grade_id text not null check (grade_id in
    ('grade-1', 'grade-2', 'grade-3', 'grade-4', 'grade-5')),
  points int not null check (points >= 0),
  max_points int not null check (max_points > 0),
  correct_count int not null check (correct_count >= 0),
  total_questions int not null check (total_questions > 0),
  rounds_completed int not null default 4 check (rounds_completed between 1 and 10),
  created_at timestamptz not null default now()
);
create index results_account_idx on practice.results (account_id, created_at desc);
create index results_created_idx on practice.results (created_at desc);

alter table practice.results enable row level security;

revoke all on practice.results from anon, authenticated, service_role;
grant select, insert on practice.results to authenticated;
grant all on practice.results to service_role;

-- admin doc/ghi toan quyen; hoc sinh chi doc + ghi ket qua cua chinh minh
create policy results_admin_all on practice.results
  for all to authenticated
  using ((select practice.is_admin()))
  with check ((select practice.is_admin()));
create policy results_self_read on practice.results
  for select to authenticated
  using (account_id = (select auth.uid()));
create policy results_self_insert on practice.results
  for insert to authenticated
  with check (account_id = (select auth.uid()));
