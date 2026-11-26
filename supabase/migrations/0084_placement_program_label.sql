-- r250: placement results were inserted without `program`, inheriting
-- the 'batch' default - the class lantern aggregate counted placement
-- tests as practice batches. Label them 'placement' and backfill the
-- existing rows (placement signature: no points, 1 max_point, 1 round).
alter table practice.results drop constraint results_program_check;
alter table practice.results add constraint results_program_check
  check (program in ('batch', 'english', 'math', 'science', 'math-vi', 'placement'));

update practice.results
set program = 'placement'
where program = 'batch' and points = 0 and max_points = 1 and rounds_completed = 1;

-- r250: also return the server-side ISO week key - the client sticker
-- claim must not drift from the aggregate's week around the Monday
-- midnight boundary. to_char 'IYYY'/'IW' = ISO year/week of the same
-- date_trunc boundary used for the count. Return type changes, so the
-- old function must be dropped first.
drop function if exists practice.class_week_lanterns();
create function practice.class_week_lanterns()
returns table (
  class_name text,
  members bigint,
  lanterns bigint,
  goal bigint,
  met boolean,
  iso_week text
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
    coalesce(l.n, 0) >= m.n * 5,
    to_char(date_trunc('week', now()), 'IYYY-"W"IW')
  from members m
  join practice.classes c on c.id = m.class_id
  left join lit l on l.class_id = m.class_id;
$$;

revoke all on function practice.class_week_lanterns() from public, anon;
revoke execute on function practice.class_week_lanterns() from service_role;
grant execute on function practice.class_week_lanterns() to authenticated;
