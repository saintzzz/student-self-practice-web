-- CR-104: repair the `___ do/does` generation artifact in english MCQ
-- prompts. The fill-in answer is an adverb of frequency, so the printed
-- verb must already be conjugated for the subject - leaving "do/does"
-- after the blank is a malformed sentence:
--   "Lan ___ do/does homework" -> "Lan ___ does homework" (3rd person)
--   "They ___ do/does homework" -> "They ___ do homework"   (plural)
--
-- Subject rule: He/She/It or a single capitalized proper name (Nam, Lan,
-- Ba, Mai...) take 'does'; pronouns/plurals (They, We, I, You, My
-- friends...) take 'do'. `a/an` slash conventions elsewhere are
-- legitimate ESL style and are NOT touched.

update practice.qb_questions
set prompt_text = regexp_replace(
  prompt_text,
  '___\s+do/does',
  case
    when substring(prompt_text from '^\s*(.+?)\s+___\s+do/does')
         ~ '^(He|She|It)$'
      or (substring(prompt_text from '^\s*(.+?)\s+___\s+do/does')
            ~ '^[A-Z][a-z]+$'
          and substring(prompt_text from '^\s*(.+?)\s+___\s+do/does')
            !~ '^(They|We|You|They''re)$')
    then '___ does'
    else '___ do'
  end,
  'g')
where subject = 'english'
  and prompt_text ~ '___\s+do/does';
