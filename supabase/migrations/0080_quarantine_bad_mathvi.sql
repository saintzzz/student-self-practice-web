-- CR-135: quarantine math-vi rows with broken Vietnamese semantics.
-- These prompts were generated before collocation typing existed
-- ("hái nhãn vở", bare nouns without classifiers, "mỗi chỗ", malformed
-- clock phrasing). Rows are kept (attempt history references them) but
-- must never serve again.
-- Convention: rejected + every publication_policy flag false (same
-- shape as 0062_quarantine_p0_questions).
update practice.qb_questions
set review_status = 'rejected',
    canonical = false,
    publication_policy = jsonb_build_object(
      'examEligible', false,
      'mockEligible', false,
      'practiceEligible', false,
      'commercialReleaseEligible', false,
      'requiresHumanApprovalForExam', false,
      'requiresHumanApprovalForCommercialRelease', false)
where subject = 'math-vi' and (
  -- 'hái' + anything not an exact harvest form (old harvest prompts
  -- used classifier-less short nouns, so ALL old 'hái' rows match)
  (prompt_text ~ 'hái được' and prompt_text !~ 'hái được [0-9]+ (quả cam|quả táo|quả xoài|quả ổi|quả mận|bông hoa|chùm nho)([,.?!]|$)')
  -- bare countable noun after a number = missing classifier
  or prompt_text ~ '[0-9]+ (nhãn vở|cam|kẹo|vở|bi|bút|sách|hoa|táo|xoài|ổi|mận|gà)([^a-zà-ỹ]|$)'
  -- 'mỗi chỗ' instead of the actual container name
  or prompt_text like '%mỗi chỗ%'
  -- malformed clock phrasing
  or prompt_text like '%chỉ phút chỉ%'
  or prompt_text ~ 'giờ rưỡi là'
  or prompt_text ~ 'Đồng hồ chỉ [0-9]+ giờ'
  or prompt_text ~ 'Bây giờ là [0-9]+ giờ'
);
