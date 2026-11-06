-- CR-128 M1: Vietnamese math track. New subject value 'math-vi' keeps
-- the track fully separated from 'math' (math-in-English, serves the
-- English exam ecosystem). results.program needs the same value so a
-- math-vi exam can be saved.
alter table practice.qb_questions drop constraint qb_questions_subject_check;
alter table practice.qb_questions add constraint qb_questions_subject_check
  check (subject in ('english', 'math', 'science', 'math-vi'));

alter table practice.results drop constraint results_program_check;
alter table practice.results add constraint results_program_check
  check (program in ('batch', 'english', 'math', 'science', 'math-vi'));
