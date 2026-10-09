-- Follow-up to 0028: service_role also needs SELECT on the audio join
-- tables used inside fetch_questions (qb_question_audio, qb_audio_assets).
-- 0028 granted qb_assets/qb_question_assets only, so service-role callers
-- (gen scripts, admin tooling) hit "permission denied for table
-- qb_question_audio" when the RPC joined audio transcripts.
grant select on practice.qb_audio_assets to service_role;
grant select on practice.qb_question_audio to service_role;
