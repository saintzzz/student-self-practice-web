-- CR-34: Arena 1v1 - async same-seed challenges.
-- Table + RPCs live in the practice schema (not exposed via the Data API);
-- clients only reach them through the SECURITY DEFINER functions below,
-- granted to authenticated only - guests (no session) get nothing.

create table if not exists practice.arena_challenges (
  id uuid primary key default gen_random_uuid(),
  seed text not null,
  grade_id text not null,
  program_id text not null check (program_id in ('english', 'math', 'science')),
  creator_id uuid not null references auth.users (id) on delete cascade,
  creator_name text not null,
  creator_score int not null check (creator_score >= 0),
  creator_time_ms int not null check (creator_time_ms >= 0),
  status text not null default 'open' check (status in ('open', 'done')),
  opponent_id uuid references auth.users (id) on delete cascade,
  opponent_name text,
  opponent_score int check (opponent_score >= 0),
  opponent_time_ms int check (opponent_time_ms >= 0),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

alter table practice.arena_challenges enable row level security;
-- No direct table access for clients: every read/write goes through the
-- RPCs below. (Defense-in-depth: schema is already unexposed.)

create index if not exists arena_open_grade_idx
  on practice.arena_challenges (grade_id, status, created_at desc)
  where status = 'open';

create index if not exists arena_creator_idx
  on practice.arena_challenges (creator_id, created_at desc);

create index if not exists arena_opponent_idx
  on practice.arena_challenges (opponent_id, created_at desc)
  where opponent_id is not null;

-- Tao thu thach sau khi choi xong tran arena cua minh.
create or replace function practice.arena_create(
  p_seed text,
  p_grade_id text,
  p_program_id text,
  p_score int,
  p_time_ms int
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  select a.display_name into v_name from practice.accounts a where a.id = v_uid;
  if v_name is null then
    raise exception 'no account';
  end if;
  insert into practice.arena_challenges
    (seed, grade_id, program_id, creator_id, creator_name, creator_score, creator_time_ms)
  values
    (p_seed, p_grade_id, p_program_id, v_uid, v_name, p_score, p_time_ms)
  returning id into v_id;
  return v_id;
end;
$$;

-- Danh sach thu thach dang mo cung khoi (khong phai cua minh).
create or replace function practice.arena_open(p_grade_id text)
returns table (
  id uuid,
  creator_name text,
  creator_score int,
  creator_time_ms int,
  program_id text,
  seed text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.creator_name, c.creator_score, c.creator_time_ms,
         c.program_id, c.seed, c.created_at
  from practice.arena_challenges c
  where c.status = 'open'
    and c.grade_id = p_grade_id
    and c.creator_id <> auth.uid()
    and c.created_at > now() - interval '7 days'
    and auth.uid() is not null
  order by c.created_at desc
  limit 20;
$$;

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
  i_won boolean
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
      or (p_score = v_row.creator_score and p_time_ms < v_row.creator_time_ms);
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
    c.finished_at
  from practice.arena_challenges c
  where c.grade_id = p_grade_id
    and c.status = 'done'
    and (c.creator_id = auth.uid() or c.opponent_id = auth.uid())
    and auth.uid() is not null
  order by c.finished_at desc
  limit 10;
$$;

revoke all on function practice.arena_create(text, text, text, int, int) from public, anon;
revoke all on function practice.arena_open(text) from public, anon;
revoke all on function practice.arena_accept(uuid, int, int) from public, anon;
revoke all on function practice.arena_recent(text) from public, anon;
revoke execute on function practice.arena_create(text, text, text, int, int) from service_role;
revoke execute on function practice.arena_open(text) from service_role;
revoke execute on function practice.arena_accept(uuid, int, int) from service_role;
revoke execute on function practice.arena_recent(text) from service_role;
grant execute on function practice.arena_create(text, text, text, int, int) to authenticated;
grant execute on function practice.arena_open(text) to authenticated;
grant execute on function practice.arena_accept(uuid, int, int) to authenticated;
grant execute on function practice.arena_recent(text) to authenticated;
