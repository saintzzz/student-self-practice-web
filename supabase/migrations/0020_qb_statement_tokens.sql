-- CR-51 F8: backfill support columns dropped on import.
-- Source questions-v6.jsonl carries `statement` (the sentence a true/false
-- item asks the learner to judge) and `tokens` (the word bank for reorder
-- items); both were silently lost, leaving every readtf item serving
-- "True or False?" with nothing to judge.
alter table practice.qb_questions
  add column if not exists statement text,
  add column if not exists tokens jsonb;

grant select on practice.qb_questions to anon, authenticated;
