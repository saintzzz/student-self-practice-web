-- CR-45 follow-up (review m4): the engagement blob is client-reported
-- jsonb. Bound its size so a student cannot write arbitrary megabytes
-- into their row.
--
-- IMPORTANT: state is self-reported. It is fine for progress display
-- and resume, but it must NEVER feed rankings, leaderboards, rewards,
-- or teacher-facing metrics without a server-side recomputation step
-- (derive points from practice.results instead).

alter table practice.engagement_state
  add constraint engagement_state_shape
  check (jsonb_typeof(state) = 'object' and pg_column_size(state) < 512000);
