-- CR-149 (P1-8): class co-op weekly lantern goal.
-- practice.class_week_lanterns(): SECURITY DEFINER rpc returning the
-- caller's class aggregate - member count, batches completed this week,
-- the shared goal (5 per member) and whether it was met. Aggregate only:
-- no per-student rows are exposed (same trust shape as
-- weekly_leaderboard, migration 0004). Caller must be enrolled.

create or replace function practice.class_week_lanterns()
returns table (
  class_name text,
  members bigint,
  lanterns bigint,
  goal bigint,
  met boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select e.class_id
    from practice.enrollments e
    where e.student_id = auth.uid()
    order by e.assigned_at
    limit 1
  ),
  members as (
    select e.class_id, count(*) as n
    from practice.enrollments e
    join mine on mine.class_id = e.class_id
    group by e.class_id
  ),
  lit as (
    select m.class_id, count(*) as n
    from practice.results r
    join practice.enrollments e on e.student_id = r.account_id
    join members m on m.class_id = e.class_id
    where r.program = 'batch'
      and r.created_at >= date_trunc('week', now())
    group by m.class_id
  )
  select
    c.name,
    m.n,
    coalesce(l.n, 0),
    m.n * 5,
    coalesce(l.n, 0) >= m.n * 5
  from members m
  join practice.classes c on c.id = m.class_id
  left join lit l on l.class_id = m.class_id;
$$;

revoke all on function practice.class_week_lanterns() from public, anon;
revoke execute on function practice.class_week_lanterns() from service_role;
grant execute on function practice.class_week_lanterns() to authenticated;
