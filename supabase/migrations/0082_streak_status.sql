-- CR-138 (edu-research W46/W47): server-truth streak + separated daily goal.
--
-- streak_status() derives the day streak from practice.results (completed
-- rounds) and today's goal progress from qb_attempt_events - no new writes,
-- both tables are already persisted and scoped to the caller via auth.uid().
--
-- Rules (Duolingo findings baked in):
--   * Streak extends on ANY 1 completed round - never gated on the goal.
--   * Weekend amulet: one missed Saturday/Sunday per ISO week does not
--     break the streak (kids rest on weekends; don't punish it).
--   * "Today" is Asia/Ho_Chi_Minh - the product's only market. A day in
--     progress never counts against the streak.
--   * rounds_today lets the client fire the day-3/7 milestone ONLY on the
--     round that earned it (first completed round of the day).
--
-- Guests get null - they keep the localStorage streak (engagement store).

create or replace function practice.streak_status()
returns jsonb
language plpgsql
security definer
set search_path = practice, pg_catalog
as $function$
declare
  v_uid uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_cursor date;
  v_streak int := 0;
  v_amulet_week date;
  v_rounds_today int;
  v_goal_done int;
  v_last_active date;
  /* r204-2: materialize the active days ONCE - the old loop probed the
     table per day with a tz-cast predicate no index can serve (up to
     400 scans/call). The created_at bound below uses the
     (account_id, created_at) index; the tz cast runs on those rows only. */
  v_active date[];
begin
  if v_uid is null then
    return null;
  end if;

  select coalesce(array_agg(d), '{}'), max(d)
    into v_active, v_last_active
    from (select distinct (created_at at time zone 'Asia/Ho_Chi_Minh')::date as d
            from practice.results
           where account_id = v_uid
             and created_at >= now() - interval '401 days') t;

  v_rounds_today := case when v_today = any(v_active) then
    (select count(*) from practice.results
      where account_id = v_uid
        and created_at >= v_today::timestamp at time zone 'Asia/Ho_Chi_Minh'
        and created_at < (v_today + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh')
    else 0 end;

  select count(*) into v_goal_done
    from practice.qb_attempt_events
   where learner_id = v_uid
     and (answered_at at time zone 'Asia/Ho_Chi_Minh')::date = v_today;

  -- Walk the in-memory set from today (or yesterday when today has no
  -- round yet - a day still in progress never breaks the run).
  v_cursor := case when v_rounds_today > 0 then v_today else v_today - 1 end;
  while v_cursor > v_today - 400 loop
    if v_cursor = any(v_active) then
      v_streak := v_streak + 1;
      v_cursor := v_cursor - 1;
    elsif extract(isodow from v_cursor) in (6, 7)
          and (v_amulet_week is null
               or v_amulet_week <> date_trunc('week', v_cursor)::date) then
      -- Consume this ISO week's weekend amulet and skip the missed day.
      v_amulet_week := date_trunc('week', v_cursor)::date;
      v_cursor := v_cursor - 1;
    else
      exit;
    end if;
  end loop;

  return jsonb_build_object(
    'streak', v_streak,
    'today_done', v_rounds_today > 0,
    'rounds_today', v_rounds_today,
    'goal_done', v_goal_done,
    'goal_target', 5,
    'last_active', v_last_active
  );
end;
$function$;

revoke all on function practice.streak_status() from public;
grant execute on function practice.streak_status() to authenticated, service_role;
