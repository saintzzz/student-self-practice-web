-- CR-135: quarantine math-vi rows with broken Vietnamese semantics.
-- These prompts were generated before collocation typing existed
-- ("hái nhãn vở", bare nouns without classifiers, "mỗi chỗ", malformed
-- clock phrasing). Rows are kept (attempt history references them) but
-- must never serve again. Already applied to production 2026-11-11;
-- kept here so the cleanup is auditable and reproducible.
update practice.qb_questions
set publication_policy = jsonb_set(jsonb_set(publication_policy, '{practiceEligible}', 'false'), '{mockEligible}', 'false'),
    canonical = false
where subject = 'math-vi' and (
  -- 'hái' + non-harvestable or bare noun (old harvest prompts used
  -- classifier-less short nouns, so ALL old 'hái' rows match)
  (prompt_text ~ 'hái được' and prompt_text !~ 'hái được [0-9]+ (quả|bông|chùm)')
  -- bare countable noun after a number = missing classifier
  or prompt_text ~ '[0-9]+ (nhãn vở|cam|kẹo|vở|bi|bút|sách|hoa)([^a-zà-ỹ]|$)'
  -- 'mỗi chỗ' instead of the actual container name
  or prompt_text like '%mỗi chỗ%'
  -- malformed clock phrasing
  or prompt_text like '%chỉ phút chỉ%'
  or prompt_text ~ 'giờ rưỡi là'
  or prompt_text ~ 'Đồng hồ chỉ [0-9]+ giờ'
  or prompt_text ~ 'Bây giờ là [0-9]+ giờ'
);
