-- CR-97: Arena live race - real-time N-player duels on one seed.
-- Rooms + players live in the practice schema; clients only reach them
-- through the SECURITY DEFINER functions below. Lobby roster travels on
-- Supabase Realtime presence; in-race progress travels on broadcast;
-- only final results persist via RPC (no per-answer writes).

create table if not exists practice.arena_rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  seed text not null,
  grade_id text not null,
  program_id text not null check (program_id in ('english', 'math', 'science')),
  question_count int not null default 10 check (question_count between 3 and 30),
  host_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'waiting' check (status in ('waiting', 'racing', 'done')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create table if not exists practice.arena_room_players (
  room_id uuid not null references practice.arena_rooms (id) on delete cascade,
  player_id uuid not null references auth.users (id) on delete cascade,
  player_name text not null,
  joined_at timestamptz not null default now(),
  score int check (score >= 0),
  time_ms int check (time_ms >= 0),
  finished_at timestamptz,
  primary key (room_id, player_id)
);

alter table practice.arena_rooms enable row level security;
alter table practice.arena_room_players enable row level security;
-- No direct table access: everything through the RPCs below.

create index if not exists arena_rooms_code_idx on practice.arena_rooms (code);
create index if not exists arena_room_players_room_idx on practice.arena_room_players (room_id);
-- One open room per host - enforced against concurrent creates too.
create unique index if not exists arena_rooms_one_open_per_host
  on practice.arena_rooms (host_id) where status in ('waiting', 'racing');

-- Capacity + freshness: rooms still 'waiting' past 2h or 'racing' past
-- 30min are stale - creation reuses none of them, joins reject them.
create or replace function practice.arena_live_create(
  p_grade_id text,
  p_program_id text,
  p_question_count int default 10
)
returns table (room_id uuid, code text, seed text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_code text;
  v_room uuid;
  v_seed text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  select a.display_name into v_name from practice.accounts a where a.id = v_uid;
  if v_name is null then
    raise exception 'no account';
  end if;
  -- One open room per host at a time. The host's own stale leftovers
  -- never block a fresh room: an abandoned waiting lobby is replaced,
  -- and a race stuck >30min (tab closed, network lost) is closed out.
  delete from practice.arena_rooms
    where host_id = v_uid and status = 'waiting';
  update practice.arena_rooms set status = 'done', finished_at = now()
    where host_id = v_uid and status = 'racing'
      and started_at < now() - interval '30 minutes';
  if exists (select 1 from practice.arena_rooms where host_id = v_uid and status = 'racing') then
    raise exception 'already has open room';
  end if;
  v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
  v_seed := 'live-' || v_code || '-' || extract(epoch from now())::bigint::text;
  insert into practice.arena_rooms (code, seed, grade_id, program_id, question_count, host_id)
    values (v_code, v_seed, p_grade_id, p_program_id, coalesce(p_question_count, 10), v_uid)
    returning id into v_room;
  insert into practice.arena_room_players (room_id, player_id, player_name) values (v_room, v_uid, v_name);
  return query select v_room, v_code, v_seed;
end;
$$;

-- The join result carries grade_id/program_id so every racer generates
-- the room's authoritative question set, not their local hub context.
drop function if exists practice.arena_live_join(text);
create or replace function practice.arena_live_join(p_code text)
returns table (room_id uuid, seed text, status text, host_name text, host_id uuid, grade_id text, program_id text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_room practice.arena_rooms;
  v_count int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  select a.display_name into v_name from practice.accounts a where a.id = v_uid;
  if v_name is null then
    raise exception 'no account';
  end if;
  -- Alias required: 'status' is an OUT param name here, so the bare
  -- column reference is ambiguous inside plpgsql. FOR UPDATE locks the
  -- room row so concurrent joins cannot both pass the capacity check
  -- and a join cannot land mid-start (start's update waits on it).
  select * into v_room from practice.arena_rooms r
    where r.code = upper(trim(p_code)) and r.status = 'waiting'
      and r.created_at > now() - interval '2 hours'
    for update;
  if v_room.id is null then
    raise exception 'no such room';
  end if;
  -- Same for arena_room_players: room_id/player_id collide with OUT
  -- param names, so every reference below is table-aliased.
  select count(*) into v_count from practice.arena_room_players p where p.room_id = v_room.id;
  if v_count >= 6 and not exists (
    select 1 from practice.arena_room_players p where p.room_id = v_room.id and p.player_id = v_uid
  ) then
    raise exception 'room full';
  end if;
  insert into practice.arena_room_players (room_id, player_id, player_name)
    values (v_room.id, v_uid, v_name)
    -- Constraint name, not a column list: plpgsql treats bare column
    -- refs in the arbiter as ambiguous with the OUT params above.
    on conflict on constraint arena_room_players_pkey do nothing;
  return query
    select v_room.id, v_room.seed, v_room.status::text,
           (select a.display_name from practice.accounts a where a.id = v_room.host_id),
           v_room.host_id, v_room.grade_id, v_room.program_id;
end;
$$;

-- Host starts the race. Returns seed so the caller does not need a
-- second round-trip.
create or replace function practice.arena_live_start(p_room_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_seed text;
  v_count int;
begin
  update practice.arena_rooms
     set status = 'racing', started_at = now()
   where id = p_room_id and host_id = v_uid and status = 'waiting'
   returning seed into v_seed;
  if v_seed is null then
    raise exception 'not host or not waiting';
  end if;
  select count(*) into v_count from practice.arena_room_players p where p.room_id = p_room_id;
  if v_count < 2 then
    raise exception 'need at least 2 players';
  end if;
  return v_seed;
end;
$$;

-- Player posts their final result. The room row is locked FOR UPDATE so
-- two simultaneous finishes cannot both see an unfinished row and leave
-- the room 'racing' forever. Time is measured server-side from
-- started_at - the real "fastest finisher" - so clients cannot claim a
-- low time. Score is capped at the max attainable.
create or replace function practice.arena_live_finish(p_room_id uuid, p_score int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_room practice.arena_rooms;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  select * into v_room from practice.arena_rooms r
    where r.id = p_room_id and r.status = 'racing'
    for update;
  if v_room.id is null then
    raise exception 'room not racing';
  end if;
  update practice.arena_room_players p
     set score = least(greatest(p_score, 0), v_room.question_count * 10),
         time_ms = greatest(0, floor(extract(epoch from now() - v_room.started_at) * 1000))::int,
         finished_at = now()
   where p.room_id = p_room_id and p.player_id = v_uid and p.finished_at is null;
  -- Under the room lock this count is serialized - no missed settle.
  if not exists (
    select 1 from practice.arena_room_players p
     where p.room_id = p_room_id and p.finished_at is null
  ) then
    update practice.arena_rooms set status = 'done', finished_at = now()
      where id = p_room_id and status = 'racing';
  end if;
end;
$$;

-- Hydrate + settle: lobby roster and final standings in one call.
-- Members only - the roster leaks names, so outsiders get nothing.
create or replace function practice.arena_live_state(p_room_id uuid)
returns table (
  status text,
  host_id uuid,
  player_id uuid,
  player_name text,
  score int,
  time_ms int,
  finished_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not exists (
    select 1 from practice.arena_room_players p
     where p.room_id = p_room_id and p.player_id = auth.uid()
  ) then
    raise exception 'not a room member';
  end if;
  return query
    select r.status::text, r.host_id, p.player_id, p.player_name, p.score, p.time_ms, p.finished_at
      from practice.arena_rooms r
      join practice.arena_room_players p on p.room_id = r.id
     where r.id = p_room_id
     order by p.score desc nulls last, p.time_ms asc nulls last, p.joined_at;
end;
$$;

-- Leaving mid-lobby removes the row; mid-race marks finished_at=now()
-- with no score so the room can still settle to 'done'.
create or replace function practice.arena_live_leave(p_room_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_status text;
begin
  -- FOR UPDATE: serializes against finish's settle check so the last
  -- leaver/finisher can never both miss the settle.
  select status into v_status from practice.arena_rooms
   where id = p_room_id for update;
  if v_status = 'waiting' then
    delete from practice.arena_room_players where room_id = p_room_id and player_id = v_uid;
    -- A waiting room dies with its host (nobody else can start it) or
    -- with the last leaver. player rows cascade on room delete.
    delete from practice.arena_rooms
      where id = p_room_id
        and (host_id = v_uid
             or not exists (select 1 from practice.arena_room_players where room_id = p_room_id));
  else
    update practice.arena_room_players
       set finished_at = now()
     where room_id = p_room_id and player_id = v_uid and finished_at is null;
    -- Same settle check as arena_live_finish: if the last racer leaves
    -- instead of finishing, the room must still flip to 'done'.
    if not exists (
      select 1 from practice.arena_room_players
       where room_id = p_room_id and finished_at is null
    ) then
      update practice.arena_rooms set status = 'done', finished_at = now()
        where id = p_room_id and status = 'racing';
    end if;
  end if;
end;
$$;

-- Same grant posture as 0006: strip the default PUBLIC execute, block
-- anon and service_role (service scripts use raw SQL anyway), grant to
-- authenticated only.
revoke all on function practice.arena_live_create(text, text, int) from public, anon;
revoke all on function practice.arena_live_join(text) from public, anon;
revoke all on function practice.arena_live_start(uuid) from public, anon;
revoke all on function practice.arena_live_finish(uuid, int) from public, anon;
revoke all on function practice.arena_live_state(uuid) from public, anon;
revoke all on function practice.arena_live_leave(uuid) from public, anon;
revoke execute on function practice.arena_live_create(text, text, int) from service_role;
revoke execute on function practice.arena_live_join(text) from service_role;
revoke execute on function practice.arena_live_start(uuid) from service_role;
revoke execute on function practice.arena_live_finish(uuid, int) from service_role;
revoke execute on function practice.arena_live_state(uuid) from service_role;
revoke execute on function practice.arena_live_leave(uuid) from service_role;
grant execute on function practice.arena_live_create(text, text, int) to authenticated;
grant execute on function practice.arena_live_join(text) to authenticated;
grant execute on function practice.arena_live_start(uuid) to authenticated;
grant execute on function practice.arena_live_finish(uuid, int) to authenticated;
grant execute on function practice.arena_live_state(uuid) to authenticated;
grant execute on function practice.arena_live_leave(uuid) to authenticated;
