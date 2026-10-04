-- CR-56: the creator must see their own open challenge ("dang cho")
-- instead of a misleading "Chua co thu thach nao" empty state.
-- arena_open drops the self-exclusion and marks rows with i_created;
-- friends' rows stay exactly as before (i_created=false -> Nhan keo).
-- Return signature changes, so drop first (grants are re-issued below).

drop function if exists practice.arena_open(text);

create or replace function practice.arena_open(p_grade_id text)
returns table (
  id uuid,
  creator_name text,
  creator_score int,
  creator_time_ms int,
  program_id text,
  seed text,
  created_at timestamptz,
  i_created boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.creator_name, c.creator_score, c.creator_time_ms,
         c.program_id, c.seed, c.created_at,
         (c.creator_id = auth.uid()) as i_created
  from practice.arena_challenges c
  where c.status = 'open'
    and c.grade_id = p_grade_id
    and c.created_at > now() - interval '7 days'
    and auth.uid() is not null
  order by c.created_at desc
  limit 20;
$$;

revoke all on function practice.arena_open(text) from public, anon;
revoke execute on function practice.arena_open(text) from service_role;
grant execute on function practice.arena_open(text) to authenticated;
