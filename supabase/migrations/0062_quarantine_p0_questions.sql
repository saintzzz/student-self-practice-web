-- 0062: quarantine confirmed P0 question defects still served via pools.
-- Found by scripts/qb-content-audit.mjs + manual review (2026-10-24):
--   * g5-english-gemini-aa398566be9f  - "Read the story" but no story exists
--     (the other 14 read-no-passage hits embed the passage in prompt_text:
--     false positives of the audit heuristic).
--   * 8 tautology/answer-leak rows - the quoted string in the prompt IS the
--     correct answer, so the item tests copying, not language skill:
--       "Which word means 'tired'?"  -> "tired"   (x4 adjective variants)
--       "Which number matches 'four'?" -> "four"  (answer should be "4")
--       "How do you say 'I am happy'?" -> "I am happy"
--       "Which words say 'thank you'?" -> "thank you"
--       word-family item that names its target 'pan' in the prompt
--     Greeting-echo items ("Someone says 'Good morning!', reply?") are
--     intentionally kept: choosing the correct echo IS the exercised skill.
--   * g1-english-bulk-14b5f8da1cb3 - mcq with only 2 choices (yes/no
--     answer masquerading as mcq; retyping to true-false would change the
--     row shape, quarantine is safer for a single G1 item).
-- The 2 unquoted digit-leak hits are false positives (counting sequence /
-- clock-face number legitimately appear in the prompt).
-- Convention: rejected + every publication_policy flag false (same shape
-- as existing rejected rows).

update practice.qb_questions
set review_status = 'rejected',
    publication_policy = jsonb_build_object(
      'examEligible', false,
      'mockEligible', false,
      'practiceEligible', false,
      'commercialReleaseEligible', false,
      'requiresHumanApprovalForExam', false,
      'requiresHumanApprovalForCommercialRelease', false)
where id in (
  'g5-english-gemini-aa398566be9f',
  'g1-english-bulk-183e53f0f85f',
  'g1-english-bulk-362815befedc',
  'g1-english-bulk-9254a4bbf4c6',
  'g1-english-bulk-943b39caa5e2',
  'g1-english-bulk-2fe2cd4e1390',
  'g1-english-bulk-52a9ed4b01bb',
  'g1-english-bulk-a33b4bcc1a21',
  'g3-english-codex-c8ceae57c121',
  'g1-english-bulk-14b5f8da1cb3'
);

-- safety: never quarantine an id that does not exist (typo guard)
do $$
declare
  v_missing int;
begin
  select 10 - count(*) into v_missing
  from practice.qb_questions
  where id in (
    'g5-english-gemini-aa398566be9f',
    'g1-english-bulk-183e53f0f85f',
    'g1-english-bulk-362815befedc',
    'g1-english-bulk-9254a4bbf4c6',
    'g1-english-bulk-943b39caa5e2',
    'g1-english-bulk-2fe2cd4e1390',
    'g1-english-bulk-52a9ed4b01bb',
    'g1-english-bulk-a33b4bcc1a21',
    'g3-english-codex-c8ceae57c121',
    'g1-english-bulk-14b5f8da1cb3');
  if v_missing <> 0 then
    raise exception '0062: % expected ids missing from qb_questions', v_missing;
  end if;
end $$;
