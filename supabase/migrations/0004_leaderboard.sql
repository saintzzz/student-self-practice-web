-- CR-30: weekly leaderboard.
-- 1) results.program so drill/exam completions can be told apart from
--    4-round batches (existing rows default to 'batch').
-- 2) practice.weekly_leaderboard(): SECURITY DEFINER rpc returning only
--    aggregate weekly standings (name + totals + rank) - no row-level
--    history is exposed. The practice schema is not exposed via the
--    Data API, so execute is granted to authenticated only.

alter table practice.results
  add column if not exists program text not null default 'batch'
  check (program in ('batch', 'english', 'math', 'science'));

create or replace function practice.weekly_leaderboard(
  p_grade_id text,
  p_limit int default 10
)
returns table (
  rank bigint,
  display_name text,
  weekly_points bigint,
  weekly_correct bigint,
  is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with caller as (
    select auth.uid() as uid
  ),
  scoped as (
    select
      r.account_id,
      sum(r.points) as weekly_points,
      sum(r.correct_count) as weekly_correct
    from practice.results r
    where r.grade_id = p_grade_id
      and r.created_at >= date_trunc('week', now())
    group by r.account_id
  ),
  ranked as (
    select
      s.account_id,
      s.weekly_points,
      s.weekly_correct,
      dense_rank() over (
        order by s.weekly_points desc, s.weekly_correct desc, s.account_id
      ) as rank
    from scoped s
  )
  select
    ranked.rank,
    a.display_name,
    ranked.weekly_points,
    ranked.weekly_correct,
    (ranked.account_id = caller.uid) as is_me
  from ranked
  join practice.accounts a on a.id = ranked.account_id
  cross join caller
  where caller.uid is not null
    and a.role = 'student'
    and (ranked.rank <= p_limit or ranked.account_id = caller.uid)
  order by ranked.rank, ranked.account_id;
$$;

revoke all on function practice.weekly_leaderboard(text, int) from public, anon;
revoke execute on function practice.weekly_leaderboard(text, int) from service_role;
grant execute on function practice.weekly_leaderboard(text, int) to authenticated;
