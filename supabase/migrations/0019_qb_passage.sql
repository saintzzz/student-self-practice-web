-- CR-51 F1: qb_questions.passage - source JSONL carried `passage` on
-- 352 reading items (mcq/true-false) but schema-v6 had no column and
-- the import dropped it, leaving "Read the passage" questions
-- unanswerable. RPCs select to_jsonb(q.*) so the new column is
-- returned automatically - no function changes needed.
alter table practice.qb_questions
  add column if not exists passage text;
