# Content Review - English Arena (Teacher-Facing Audit)

> **Báo cáo rà soát nội dung - English Arena (Tiếng Anh tiểu học, Lớp 1-5)**
>
> Review type: **READ-ONLY** educational content audit (không sửa source).
> Scope: `src/data/**` (vocabulary, exam banks, ipaMap, stories), `src/lib/generators/**`,
> `src/lib/exam/**`, `src/lib/phonics/**`, `src/lib/rounds/**`, `src/games/stories.ts`,
> `src/lib/practiceSession.ts`, `src/components/StartBatchScreen.tsx`.
> Reviewer: Devin subagent - full source audit, 2026-10 content review pass already applied upstream.

---

## 1. Tóm tắt cho giáo viên / Executive Summary

English Arena's content engine is **unusually well-engineered for a children's
EFL product**. The vocabulary bank is curated with real linguistic care:
sound-aware article selection (`a`/`an` by phoneme not letter), countability
reasoned per-word (scissors/pants/glasses/chopsticks correctly excluded from
counting questions), a single-emoji-per-word invariant enforced by tests, a
sentence-class system (~17 classes) that produces grammatical model sentences
("I go to school" bare-institution BrE, "I like the moon", "She is a mermaid"),
and a G1-2 gap-bank validator (V0-V7) that blocks homophone/minimal-pair
distractors by ear. The authored exam banks (grammar, IOE pronunciation,
science-with-misconception-distractors, reading) are **factually clean** - I
found no wrong answers in any authored item.

**Nhưng vẫn có một số lỗi nội dung thật** - chủ yếu ở vùng biên: một vài từ
không gõ được (có dấu), một câu mẫu sai sự thật ("I can count to infinity"),
hai câu mẫu có thông điệp xấu ("I want to be a liar / a villain"), và vài lỗi
phonics (silent-w/sc/ký tự im lặng bị xếp nhầm thành cụm phụ âm).

| Khu vực / Area | Điểm /5 | Nhận xét ngắn |
|---|---|---|
| Từ vựng - độ đúng nghĩa/dịch | 4.5 | Glosses đúng, chăm chút (Wales→"Xứ Wales", Kosovo→"Vùng Kosovo") |
| Ngữ pháp câu mẫu (sentence classes) | 4.0 | Rất tốt; trừ 3 lỗi biên (infinity, liar, villain, Santa) |
| Phonics data (âm đầu/cuối/blend/vần) | 3.5 | Exceptions tốt; còn 6 lỗi blend/final còn sót |
| Exam banks (grammar/IOE/science/reading/reorder) | 5.0 | Không tìm thấy đáp án sai; distractor có tư duy misconception |
| Phù hợp lứa tuổi/tone | 3.5 | Quái vật/kiếm ok; cần xem lại 'crazy', 'liar', 'woozy', 🫦, 'kiss' |
| Vietnamese copy (gạch ngang, lỗi chính tả) | 5.0 | Không có em-dash/en-dash nào trong `src/`; prompt sạch |
| Data hygiene/kiến trúc | 4.5 | Invariant có test; distractor guard chống emoji trùng |

---

## 2. Findings - Bảng phát hiện

Severity: **C**ritical (sai nội dung sư phạm / câu hỏi không thể trả lời),
**H**igh (lỗi chắc chắn xuất hiện trong bài học), **M**edium (đáng sửa, ảnh
hưởng nhỏ hoặc phụ thuộc chính sách), **L**ow (trau chuốt).

| # | Sev | File:line | Finding (EN + VI) | Đề xuất sửa |
|---|-----|-----------|-------------------|-------------|
| F1 | **C** | `src/lib/practiceSession.ts:46-48`, `src/data/vocabulary/g4/xp.ts:34`, `:258` | **Typed answers with diacritics are unanswerable.** `piñata` and `Åland` flow into `listening-sentence-fill-blank` typing items (G3-5 round 2). `normalizeAnswer` strips punctuation but KEEPS `ñ`/`Å` (they are `\p{L}`), so a child typing "pinata"/"Aland" is marked wrong. `generateListeningFillBlankQuestions` (`listeningFillBlank.ts:13`) maps every word with no charset filter; `listeningSentenceFillBlank.ts` has none either. | Exclude non-`[a-z]` words from typing pools (same pattern as `extraLetter.ts:97` `/^[a-z]+$/i`), or NFD-fold diacritics in `normalizeAnswer`. |
| F2 | **C** | `src/lib/generators/listeningSentenceFillBlank.ts:113,356`, `src/data/vocabulary/g4/xp.ts:155` | **"I can count to infinity."** - `infinity` is overridden to the `number` class whose only template is "I can count to ___". Mathematically false model sentence presented as correct English. `zero` (:328) → "I can count to zero" is also wrong-headed (you count *down* to zero). | New class or drop overrides; e.g. `the-noun` ("I like the infinity symbol" still odd - better a dedicated frame or remove from sentence questions). |
| F3 | **C** | `src/lib/generators/listeningSentenceFillBlank.ts:94,308,250`, `src/data/vocabulary/g3/xp.ts:101,129` | **"I want to be a liar." / "I want to be a villain."** - `liar` is hard-overridden to `occupation` (:308) and `villain` inherits it from `g3-xp-people`'s topic class (:250). The occupation template at :94 generates aspiration sentences - actively harmful model English for children. (Same frame yields silly-but-benign "I want to be a vampire/zombie/santa-claus" for all other monster nouns.) | Reclass `liar`/`villain` to `the-noun` or remove from sentence questions; consider a `character` class with only "He is a ___"/"I can see a ___" frames (no aspiration). |
| F4 | **H** | `src/lib/phonics/blends.ts:17-42,49` + callers `phonicsDeep.ts:62`, `oddPronunciation.ts` | **Silent-letter onsets misclassified as blends.** `two`→`tw`, `sword`→`sw` (both have silent w - the words start /t/ and /s/), `science`/`scientist`/`scissors`→`sc` (`sc` before i/e is /s/, not a cluster). `BLEND_EXCEPTIONS` is empty (:49). These words generate wrong blend-choice questions in round 4 and can seed wrong odd-one-out families. `school`→`sch` is defensible orthographically but /skl/ is not a taught blend - review ruling needed. | Add `two`, `sword`, `science`, `scientist`, `scissors` to `BLEND_EXCEPTIONS`; decide `sch` policy (drop or keep as spelling-blend). |
| F5 | **H** | `src/lib/phonics/finalSounds.ts:107-110` | **"PE" keyed to final sound `p`.** Silent-e rule strips the 'e' from acronym `pe` → `p`, but "PE" is pronounced /piː iː/ - it ends in a vowel sound. Same residual-family: `x-ray`→`y` (ending sounds like 'a'), `karate`→`t` (ends /i/), `massage`→`j` (ends /ʒ/), `cd`/`dvd` end in letter-name vowels keyed to `d`. | Add `pe: 'e'` exception; optionally add `x-ray: 'a'`, `karate: 'e'`, letter-name acronyms to vowel keys. |
| F6 | **H** | `src/lib/generators/listeningSentenceFillBlank.ts:128,255-258`, `src/data/vocabulary/g4/xp.ts:~480` | **"I am from the European Union."** - flag topics are class `country` whose frame is "I am from ___". 🇪🇺 is not a country; no one is "from" it. Also inside a topic literally named "Các nước châu Âu" (European COUNTRIES). | Override `european-union` to a safe class or drop the word. |
| F7 | **M** | `src/data/vocabulary/g4/xp.ts:~471` vs `g5` countries | **England and Britain both glossed "Nước Anh".** England ⊂ Great Britain ⊂ UK - two different headwords carrying the same Vietnamese meaning confuses children when both appear. | Gloss `britain` as 'Nước Anh (Vương quốc Anh)' or `england` as 'Xứ Anh' to distinguish (consistent with 'Xứ Wales' already used). |
| F8 | **M** | `src/data/vocabulary/g5/xp.ts:~499-501`, `g4/xp.ts:~463` | **Political-sensitivity flags for a VN product:** 🇹🇼 Taiwan, 🇭🇰 Hong Kong, 🇲🇴 Macau inside a "Các nước" (countries) topic, and 🇽🇰 Kosovo glossed 'Vùng Kosovo' (good instinct) but still generating "I am from Kosovo." VN follows One-China; flag-in-country-list can draw parent/regulator complaints. | PM/governance ruling: retitle the topics "Quốc gia và vùng lãnh thổ" (as `g5-xp-flags-oceania` already does!) or gloss Taiwan/HK/Macau as "vùng". The oceania topic already models the safer pattern. |
| F9 | **M** | `src/data/vocabulary/g4/xp.ts` (ok-badge/new-badge/free-badge/vs-badge block) | **Non-lexis padding:** 🆗 'ok-badge', 🆕 'new-badge', 🆓 'free-badge', 🆚 'vs-badge' are emoji-buttons, not teachable vocabulary - and they generate odd sentences ("I have a NEW badge"). Same cluster: 'equals-sign'/'plus-sign'/... are defensible math-crossover items, but the badges are junk. | Drop the four badge words or move to a trivia/sign topic with `the-noun` frames. |
| F10 | **M** | `src/data/vocabulary/g3/xp.ts:101-138` + `:116` | **Age/tone cluster (G3):** vampire, zombie, skull, goblin, ogre are fine fun-content; but `crazy` glossed 'Hâm hâm điên điên' (teaches a mocking term for mental illness), `liar`, `woozy` (adult), `kiss`→"I can kiss"/"I like to kiss", and 🫦 'lip' (the "biting lip" emoji carries flirtatious usage) deserve a teacher eyeball. `santa-claus` also gets "He is a Santa Claus" (proper noun + article). | Teacher review of ~8 glosses; 🫦→👄 for 'lip'; `santa-claus` to `the-noun` ("I like Santa Claus" reads fine) or proper-noun class. |
| F11 | **M** | `src/lib/rounds/roundDefinitions.ts` vs task/product copy | **Structure mismatch:** a batch is 4 rounds × ~10 questions + a seeded bonus game-round - not "4-question rounds" as some docs/briefs describe. If any user-facing text promises 4-question rounds it is wrong. | Align copy; the code structure itself is consistent (R1 extra-letter+image, R2 sentence-typing+listening-image, R3 pronunciation ×10, R4 matching+describe+phonics, bonus game from a 5-game pool). |
| F12 | **L** | various | **Small residuals:** 'thumbs-up' plural 'thumbs-ups' (nonstandard); 'tick' ✔️→"I have a tick" (parasite homonym); 'elevator'→place→"I go to the elevator" (should be "take"); 'x-ray'→`the-noun` loses the natural "I have an X-ray" (article() already knows `x-ray`→an); 'nest-eggs'/'snowy sky' phrase-as-headword; 'storm'(g2) vs 'typhoon'(g3) both 'cơn bão'; 'grasshopper' uses 🦗 (officially the CRICKET emoji); 🏉 rugby vs 🏈 american-football near-identical distractors in the G3 pool; 'moved'→"I am moved" unnatural; 'neutral' as feeling odd; 'hug'→"I can hug" awkward; 'good-luck'→sport class→"I like good luck" semantically odd; obsolete-tech cluster (fax 📠, videotape 📼, floppy disk 💾, CD/DVD) for 2025 kids - period vocab, defensible but dated. | Item-level tweaks; none block learning. |

---

## 3. Per-question-kind notes / Ghi chú theo dạng câu

| Question kind | File | Content verdict |
|---|---|---|
| image-choice / listening-image-choice | `imageChoice.ts`, `listeningImageChoice.ts` | Solid - `isLiteralImageWord` excludes figurative/flag words from picture questions; same-emoji distractor guard present (countingImageDistractors.ts:40-50). Residual: cross-topic hyponym collisions (kitten/cat, bunny/rabbit, rugby/American-football) are live in whole-grade pools. |
| counting-image | `countingImage.ts` + `Distractors.ts` | Countability carefully curated (plural-only nouns excluded). Clean. |
| extra-letter | `extraLetter.ts:97` | `^[a-z]+$` filter - diacritic words correctly excluded. Clean. |
| listening-sentence-fill-blank (typing) | `listeningSentenceFillBlank.ts` (473 lines) | ~17-class frame system is genuinely impressive; only F1/F2/F3/F6 edge cases remain. No charset eligibility filter (F1). |
| Spell-it tiles (G1-2) | `spellEligibility.ts` | `[a-z]{2,6}` cap + confusable-pair exclusion (b/d, p/q, m/n, i/l) + never-pre-sorted shuffle. Excellent. |
| Gap word-bank (G1-2) | `gapBankTopics.ts`, `gapBankValidator.ts` | V0-V7 validator (frame match, reviewed topic allowlist, plural/homophone pairs, Levenshtein≥2, stem-leak) - best-in-class. Only 7 topics reviewed-in so far; expand gradually. |
| picture-pair-matching | `picturePairMatching.ts:53-66` | Unique-emoji board guarantee. Clean. |
| phonics sound/word/final/blend/rhyme | `phonics.ts`, `phonicsDeep.ts`, `initialSounds.ts`, `finalSounds.ts`, `blends.ts`, `rhymes.ts` | Initial-sound exceptions table is well maintained (chef→sh, write→r, hourglass excluded). Final-sound letter-level convention documented and consistent. F4 (blends) + F5 (PE) are the open items. Rhyme `solo:` singleton design is elegant and correct (plane→ain, bread→ed, elephant/eggplant ant-weak). |
| letter-tracing (G1-2) | `letterTracing.ts` | 26-glyph stroke set, seeded exhibit word. Clean. |
| pronunciation-recording | `pronunciationRecording.ts` + `data/ipaMap.ts` | ipaMap spot-check (~20 entries incl. sword sɔrd, scissors ˈsɪzərz, thailand ˈtaɪˌlænd, receipt rɪˈsit) all correct AmE. Recording prompt = bare word - fine. |
| exam: mathEnglish | `lib/exam/mathEnglish.ts` | Generated arithmetic is self-consistent (answer = prod−c never negative, dedupe via `seen`). BrE "hundred and X" consistent with SGK. MATH_FACTS all correct. Clean. |
| exam: science | `scienceQuestions.ts` + `data/scienceBank.ts` | Authored facts verified - all correct (Mercury closest, Jupiter biggest, CO2 for plants, vertebrates/backbone, axial tilt seasons, simultaneous drop). Distractors are real misconceptions with per-option whyVi. `subjectPhrase` correctly emits "The sun…", "Water…", "An earth…"→"The Earth". Pluto correctly a non-planet. **Best file in the review.** |
| exam: grammar/IOE/reading/reorder | `data/grammarBank.ts`, `ioeBanks.ts`, `readingBank.ts`, `reorderBank.ts` | All ~60 authored items verified correct (incl. subtle ones: kitchen /tʃ/≠train /t/, Monkey /ʌ/=MONDAY, collect /ə/=TODAY, weeks /s/ vs days/plays/bags /z/). Reorder sentences all grammatical. |
| missing-letter | `lib/exam/missingLetter.ts` | Masks 1-3 interior letters, `_ ` per letter - IOE-authentic; `[a-z]+` filter prevents diacritic issue here. Clean. |
| odd-pronunciation | `lib/exam/oddPronunciation.ts` | Solo-key exclusion + 3-member families + cross-dimension checks. Sound; inherits F4/F5 key errors. |
| word-order | `lib/exam/wordOrder.ts` | Reuses curated sentence bank - guaranteed grammatical; scramble-never-solves-itself guarantee. Clean. |
| stories | `src/games/stories.ts` | 3 stories/grade, karaoke sentences, 3 MCQs each - samples verified correct and level-appropriate. |
| band scoping | `StartBatchScreen.tsx:97-102` + grade banks | 4 programs (Tiếng Anh, Toán, Toán tiếng Anh, Khoa học); grade-bank split G12/G3/G45 consistently applied. Clean. |

---

## 4. Band/curriculum assessment / Đánh giá theo khối lớp

- **G1-2:** rounds are pre-reader friendly (image/listening/spell-tiles/tracing);
  vocab is concrete and literal; the gap-bank + confusable-letter machinery is
  pedagogically sound. The xp packs add monsters (vampire/zombie) via G3 only -
  G1-2 stays clean.
- **G3:** the xp packs introduce the flagged tone items (F10) and the
  `g3-xp-people` occupation-class misfires (F3). Blend questions (F4) hit this
  band hardest via round 4.
- **G4:** time-topic (o'clock/half-past) is excellent and maps straight to the
  SGK unit; but F1 (piñata/Åland), F2 (infinity), F6 (EU) all live here.
- **G5:** country/flag topics are the richest content; F7/F8 live here.
- **Exam programs:** all bands clean (table above); science G45 is the
  strongest authored content in the app.

---

## 5. Method note / Lưu ý phương pháp

- Prior "Content audit 2026-10" fixes are already applied in-source (same-emoji
  distractor guard, unique-emoji pair boards, science article helpers, several
  phonics/sentence-class overrides) - this review found the *next* layer of
  issues, mostly in phonics edge cases and occupation/number class overrides.
- All findings cite current `src/` line numbers on `main`.
- Vietnamese copy sweep: **zero** em-dash/en-dash occurrences in `src/**/*.ts{,x}`.
