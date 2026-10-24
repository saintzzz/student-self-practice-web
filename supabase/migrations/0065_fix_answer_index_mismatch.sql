-- CR-111 r130 follow-up: repair answer.index drift where answer.text is correct
-- but answer.index points at a different choice. 3 of these rows are actively
-- served (approved / llm-polished); index is what grading resolves, so students
-- picking the right text would be scored wrong.
--
-- Verified live 2025: 9 rows where choices[answer.index] != answer.text.
-- Fix aligns index to the choice position matching answer.text.

begin;

-- Served rows (answer.text is the pedagogically correct option)
update practice.qb_questions
set answer = jsonb_set(answer, '{index}', '2'::jsonb)
where id = 'g3-english-gemini-c60c21c0fed4'
  and answer->>'text' = 'four'
  and choices->>2 = 'four';

update practice.qb_questions
set answer = jsonb_set(answer, '{index}', '2'::jsonb)
where id = 'g3-english-gemini-e0779f23e0c3'
  and answer->>'text' = 'three'
  and choices->>2 = 'three';

update practice.qb_questions
set answer = jsonb_set(answer, '{index}', '0'::jsonb)
where id = 'g5-english-gemini-875b9031dd64'
  and answer->>'text' = 'will be'
  and choices->>0 = 'will be';

-- Rejected rows: align index for data hygiene (not served, but consistent
-- data matters if they are ever restored)
update practice.qb_questions
set answer = jsonb_set(answer, '{index}', to_jsonb(p.idx))
from (
  select q.id,
         (select ord - 1
          from jsonb_array_elements_text(q.choices) with ordinality as c(val, ord)
          where lower(c.val) = lower(q.answer->>'text')
          limit 1) as idx
  from practice.qb_questions q
  where q.id in (
    'g1-english-bulk-2fde2ba2f513',
    'g1-english-bulk-753e5439ac83',
    'g2-english-codex-fb51d5f584f8',
    'g2-english-gemini-681d0b45840e',
    'g3-english-gemini-5fe1659ba88c',
    'g5-english-gemini-49be4e60707e'
  )
    and q.review_status = 'rejected'
) p
where practice.qb_questions.id = p.id
  and p.idx is not null
  and lower(practice.qb_questions.choices->>(practice.qb_questions.answer->>'index')::int)
      is distinct from lower(practice.qb_questions.answer->>'text');

commit;
