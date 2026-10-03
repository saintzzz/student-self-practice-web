-- CR-48 phase 5 / V7-AR-002: immutable review history.
-- Moi quyet dinh review ghi lai actor + action + reason + timestamp
-- trong qb_review_events (insert-only qua RPC). reject/flag bat buoc ly do.

create table if not exists practice.qb_review_events (
  id bigint generated always as identity primary key,
  question_id text not null references practice.qb_questions(id),
  action text not null check (action in ('approve', 'reject', 'flag')),
  reason text not null default '',
  actor_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table practice.qb_review_events enable row level security;

create policy qb_review_events_admin_select
  on practice.qb_review_events for select to authenticated
  using (practice.is_admin());

-- Khong insert/update/delete truc tiep tu client: chi qua review_question.

create or replace function practice.review_question(
  p_question_id text,
  p_action text,  -- 'approve' | 'reject' | 'flag'
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = practice, pg_catalog
as $$
declare
  new_status text;
  reason text := btrim(coalesce(p_reason, ''));
begin
  if not practice.is_admin() then
    raise exception 'admin only';
  end if;
  if p_action not in ('approve','reject','flag') then
    raise exception 'unknown action %', p_action;
  end if;
  if p_action in ('reject','flag') and reason = '' then
    raise exception 'reason required for %', p_action;
  end if;
  new_status := case p_action
    when 'approve' then 'approved'
    when 'reject' then 'rejected'
    else 'flagged' end;

  update practice.qb_review_queue
    set review_status = new_status,
        reviewer_id = auth.uid(),
        reviewed_at = now()
    where question_id = p_question_id;

  if p_action <> 'flag' then
    update practice.qb_questions
      set review_status = new_status,
          publication_policy = case when p_action = 'approve'
            then publication_policy || '{"examEligible": true}'::jsonb
            else publication_policy || '{"examEligible": false, "practiceEligible": false, "mockEligible": false}'::jsonb
          end
      where id = p_question_id;
  else
    update practice.qb_questions
      set review_status = new_status
      where id = p_question_id;
  end if;

  insert into practice.qb_review_events (question_id, action, reason, actor_id)
    values (p_question_id, p_action, reason, auth.uid());

  return jsonb_build_object('questionId', p_question_id, 'status', new_status);
end;
$$;

revoke all on function practice.review_question(text, text, text) from public, anon;
grant execute on function practice.review_question(text, text, text) to authenticated;
revoke execute on function practice.review_question(text, text) from authenticated;
drop function if exists practice.review_question(text, text);
