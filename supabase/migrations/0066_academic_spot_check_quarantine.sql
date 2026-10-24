-- CR-111 / academic spot-check (seed prd-2026, sample 600): quarantine
-- rows that are individually defective and not covered by the
-- deterministic template repairs (repair-template-defects.mjs).
-- Classes: opinion/subjective prompts, prompts missing the required
-- image/context, multiple defensible answers, content beyond grade
-- scope, and factual/pedagogical errors that cannot be repaired
-- deterministically.
begin;

update practice.qb_questions set review_status = 'rejected' where id in (
  -- prompt requires an image/context that does not exist
  'g1-english-bulk-230b987f0260', -- "What body part is this?" no asset
  'g1-english-bulk-4e8b337bedcf', -- "Choose the correct word:" bare
  -- more than one defensible answer
  'g1-english-bulk-9cb4165e8f17', -- cow gives milk AND meat
  'g1-english-bulk-c9a69328d7ff', -- frog green OR brown
  'g1-english-bulk-4fb5c05f3fad', -- top spins but does not move upward
  'g1-english-bulk-ecd1b0060e0e', -- Glad/Happy to meet you synonyms
  'g3-english-bulk-3467ba0091df', -- 11:45 = quarter to twelve = eleven forty-five
  'g3-english-bulk-8f55367b23fc', -- "always" allows present AND past
  'g3-english-bulk-2555fc79f329', -- whale vs dolphin size is species-dependent
  'g3-english-bulk-7f9fce7ec807', -- birds also nest in sand/caves
  'g3-english-bulk-85fcfac452f0', -- January-vs-July is hemisphere-dependent
  'g3-english-gemini-d3c1fb826079', -- "in" and "next to" the park both valid
  'g3-english-gemini-fca311a6425c', -- at/in/on the playground all valid
  'g2-science-tpl-be12e1ec7fc7', -- lizard AND ant live in rocks/walls
  -- prompt has no blank/task at all
  'g1-english-bulk-783e1e976d79', -- "My head is on my neck." no task
  'g1-english-bulk-debff502779b', -- "I have one arm." no task
  -- subjective / invalid inference
  'g3-english-bulk-7f8ea3113312', -- "Which subject is harder" is opinion
  'g2-english-bulk-f5927269cd77', -- baking once does not imply job=baker
  -- beyond grade-1 scope (elapsed time, multi-step money)
  'g1-math-tpl-de14f7241892',
  'g1-math-v6-b004dcc96036',
  'g1-math-tpl-4f9e56a11998',
  'g1-math-tpl-a0c388ea7c4d'
);

commit;
