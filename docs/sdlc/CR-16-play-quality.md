# CR-16 (2026-09-30): Play-quality fixes - sentence semantics, TTS voice, wrong-answer explanation, branded play UI

## Request
User found nonsense sentences in production ("I want some spring."),
reported TTS voice hard to hear, no explanation shown on wrong answers,
and practice screens visually disconnected from login/landing/admin
navy-gold brand.

## Scope
1. Generator semantics: "I want some X" (mass template) is only valid for
   consumables/usable substances. Reclassify:
   - spring/summer/autumn/winter -> new 'season' class ("I like spring.")
   - homework, shopping, sightseeing, photography, roller-skating, cheer
     -> 'sport' frames ("I like X." / "Do you like X?")
   - blood, DNA, coral -> new 'substance' class ("There is some X.")
   - light-rail -> 'the-noun' ("I can see the light rail.")
   - policewoman/bride/mermaid -> new 'she-noun' class ("She is a X.")
     replacing countable frames ("I have a bride" is silly)
   - peace (V-sign gesture) -> rename to 'peace sign', countable
   - keep 'mass' = want-some ONLY where idiomatic (food, drink, supplies,
     money, plurals like scissors/glasses/chopsticks)
2. TTS: rank en voices by quality (Google US English, Microsoft Natural,
   Samantha, ...), slow rate to 0.9 for young learners.
3. Wrong-answer feedback: show the picked wrong answer + full correct
   sentence so the child sees why (FeedbackPanel/QuestionCard).
4. Play surfaces -> navy/gold VieSchool brand (tokens CARD/CHIP/NAV_PILL
   dark variants, option tiles, inputs, FeedbackPanel, round chrome) while
   keeping kid-friendly elements (emoji, mascot, big 76px targets, status
   colors emerald/rose).

## Impact
- listeningSentenceFillBlank.ts: +2 classes, ~20 word overrides updated
- speech.ts: voice ranking + rate
- FeedbackPanel + QuestionCard: picked-answer display
- tokens.ts, optionButtonStyle.ts, ~15 question/round components: palette
- Tests: update class assertions; snapshot regeneration

## Acceptance
- Zero "I want some <non-consumable>" sentences; audit script re-run clean
- Every play surface uses navy/gold tokens; no light-card leftover
- Gates: tsc + unit + build green; Playwright QA on dev

## Result
- Sentence audit: `BAD want-some: 0`; seasons -> "I like spring." /
  "It is spring.", places -> "I go to the bank.", substances ->
  "There is some blood.", she-nouns -> "She is a policewoman.",
  activities -> sport frames, light-rail -> the-noun,
  peace -> "peace sign" countable.
- TTS: voice quality ranking + rate 0.9.
- Feedback: wrong answers now show picked letter + correct word +
  explanation ("Em chon: m / Tu dung la: mosque").
- App shell: all screens render on VieSchool 'brand' navy/gold
  surface; land cards keep kid accents.
- Gates: 715 unit green (incl. updated FeedbackPanel + classes tests),
  tsc clean, vite build pass.
- Playwright QA (local :5199): login, guest map, grade select, batch
  start, active question, wrong-answer feedback - screenshots
  qa-map-dark.png, qa-question.png, qa-wrong.png.
