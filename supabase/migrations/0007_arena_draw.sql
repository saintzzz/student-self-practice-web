-- CR-34 review fix: exact ties must surface as a draw, not a loss.
-- The return shape changes (new is_draw column), so the functions are
-- dropped and recreated rather than OR REPLACE'd.

drop function if exists practice.arena_accept(uuid, int, int);
drop function if exists practice.arena_recent(text);

-- Nhan thu thach: atomic claim - chi khi con open va khong phai cua minh.
create or replace function practice.arena_accept(
  p_id uuid,
  p_score int,
  p_time_ms int
)
returns table (
  my_score int,
  my_time_ms int,
  opp_name text,
  opp_score int,
  opp_time_ms int,
  i_won boolean,
  is_draw boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_row practice.arena_challenges%rowtype;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  select a.display_name into v_name from practice.accounts a where a.id = v_uid;
  if v_name is null then
    raise exception 'no account';
  end if;
  -- FOR UPDATE locks the row so a second accepter cannot race in.
  select * into v_row
  from practice.arena_challenges
  where id = p_id
  for update;
  if not found then
    raise exception 'challenge not found';
  end if;
  if v_row.status <> 'open' then
    raise exception 'challenge already taken';
  end if;
  if v_row.creator_id = v_uid then
    raise exception 'cannot accept own challenge';
  end if;
  update practice.arena_challenges
  set status = 'done',
      opponent_id = v_uid,
      opponent_name = v_name,
      opponent_score = p_score,
      opponent_time_ms = p_time_ms,
      finished_at = now()
  where id = p_id;
  return query
  select
    p_score,
    p_time_ms,
    v_row.creator_name,
    v_row.creator_score,
    v_row.creator_time_ms,
    (p_score > v_row.creator_score)
      or (p_score = v_row.creator_score and p_time_ms < v_row.creator_time_ms),
    (p_score = v_row.creator_score and p_time_ms = v_row.creator_time_ms);
end;
$$;

-- 10 tran gan nhat cua minh (ca tao lan nhan).
create or replace function practice.arena_recent(p_grade_id text)
returns table (
  id uuid,
  creator_name text,
  creator_score int,
  creator_time_ms int,
  opponent_name text,
  opponent_score int,
  opponent_time_ms int,
  i_created boolean,
  i_won boolean,
  is_draw boolean,
  finished_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.id,
    c.creator_name,
    c.creator_score,
    c.creator_time_ms,
    c.opponent_name,
    c.opponent_score,
    c.opponent_time_ms,
    (c.creator_id = auth.uid()) as i_created,
    case
      when c.creator_id = auth.uid() then
        (c.creator_score > c.opponent_score)
          or (c.creator_score = c.opponent_score and c.creator_time_ms < c.opponent_time_ms)
      else
        (c.opponent_score > c.creator_score)
          or (c.opponent_score = c.creator_score and c.opponent_time_ms < c.creator_time_ms)
    end as i_won,
    (c.creator_score = c.opponent_score and c.creator_time_ms = c.opponent_time_ms) as is_draw,
    c.finished_at
  from practice.arena_challenges c
  where c.grade_id = p_grade_id
    and c.status = 'done'
    and (c.creator_id = auth.uid() or c.opponent_id = auth.uid())
    and auth.uid() is not null
  order by c.finished_at desc
  limit 10;
$$;

revoke all on function practice.arena_accept(uuid, int, int) from public, anon;
revoke all on function practice.arena_recent(text) from public, anon;
revoke execute on function practice.arena_accept(uuid, int, int) from service_role;
revoke execute on function practice.arena_recent(text) from service_role;
grant execute on function practice.arena_accept(uuid, int, int) to authenticated;
grant execute on function practice.arena_recent(text) to authenticated;
