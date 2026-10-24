-- CR-111 wave 1: fix genuinely ambiguous/leaky approved items found in the
-- content audit's ambiguous-open-prompt queue (manual triage of all 24).
-- Every edit keeps the same question type, answer, and learning intent.

-- 1) "Do you like skipping?" allowed BOTH "Yes, we do." and "No, we don't."
--    as true answers. Make the negative distractor ungrammatical so the
--    do/does-response drill keeps exactly one defensible key.
update practice.qb_questions
set choices = '["Yes, we are.","No, we can''t.","Yes, we do.","No, we doesn''t."]'::jsonb
where id = 'g2-english-codex-7290a81c5914';

-- 2) "I like ___." accepted all four gerund phrases. Constrain with a place
--    so only 'reading books' fits.
update practice.qb_questions
set prompt_text = 'What do you like doing in your free time? - I like ___ in the library.'
where id = 'g3-english-gemini-648481753a02';

-- 3) Prompt was already the complete question "What do you want for lunch?"
--    with wh-word choices - the blank belongs INSIDE the prompt, plus a
--    food answer to force 'What'.
update practice.qb_questions
set prompt_text = '___ do you want for lunch? - Some rice and chicken, please.'
where id = 'g4-english-gemini-8e4563f1c293';

-- 4) Prompt leaked the answer in Vietnamese: "I ___ see the sun. Tôi không
--    thể." Replace the gloss with an English context that forces 'can't'.
update practice.qb_questions
set prompt_text = 'It is night. I ___ see the sun.'
where id = 'g2-english-codex-53e070ec3d7c';
