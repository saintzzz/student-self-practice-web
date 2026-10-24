-- 0063: CR-110 data-quality wave 2 (question-level fixes).
-- (form-payload repair + dup-prompt variant grouping were applied via
-- scripts/repair-form-refs.mjs / scripts/group-dup-prompts.mjs and are
-- verified by the qb-content-audit checks - they are data patches, not
-- schema changes, so they live in scripts for rerunnability.)

-- 1) Restore g1/g2 rubric questions: every speaking/constructed-response
--    item at these grades was blanket-'rejected' although the content is
--    canonical and sound (teacher-administered oral/written sections of
--    the diagnostic/midterm/final forms need them). publication_policy
--    stays all-false so pool RPCs still never serve them.
update practice.qb_questions set review_status = 'approved'
where grade in (1, 2) and subject = 'english'
  and question_type in ('speaking-prompt', 'constructed-response')
  and review_status = 'rejected';

-- 2) Quarantine remaining real defects found in the CR-110 sweep:
--    duplicate choices (3) + explanation too short to teach (1).
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
  'g2-english-gemini-3ed3567b86d1',   -- dup choice "any"/"any"
  'g4-english-bulk-icon-15db49b9bc92', -- dup choice "sweden"/"sweden"
  'g5-english-gemini-5fa2de592187',  -- dup choice "should"/"should"
  'g3-english-gemini-4c8fd22389fd'   -- explanation under 20 chars
);

-- 3) Strip a foreign accent from a served prompt (asset slug renders the
--    label as "t rkiye" - prompt must use the ASCII form the bank uses).
update practice.qb_questions
set prompt_text = 'Which picture matches the country name "Turkiye"?'
where id = 'g5-english-bulk-icon-50bd11e01743';
