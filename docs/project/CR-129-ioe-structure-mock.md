# CR-129 - Thi thu IOE theo cau truc cuoc thi that

## Why

Top harvest item from the Cupimath analysis: competition-structure
mocks are the purchase trigger for VN parents ("de IOE dung cau truc"),
not more games. Our bank already follows IOE-style kinds and the fetch
RPC supports per-skill filtering - the missing piece is composing a
sectioned paper with competition framing.

## Scope

New "Thi thu IOE" option under the English program card on the exam
picker, with 3 rounds:

- Cap truong: 30 cau / 20 phut
- Cap huyen: 40 cau / 25 phut, minDifficulty 2
- Cap tinh: 45 cau / 30 phut, minDifficulty 3

Every round uses the same 4-section IOE shape:

1. Nghe hieu - skills: listening
2. Tu vung va ngu phap - skills: vocabulary-recognition,
   vocabulary-in-context, grammar-use-of-english, functional-language
3. Doc hieu - skills: reading
4. Dien tu va viet - skills: writing

Sections fetch separately via the existing `p_skills` bank RPC so the
composition is guaranteed; questions concat into one `ExamState` with an
`examLabel` describing the round + section boundaries + award tiers.

Result screen: existing score + per-section correct counts + "muc giai
uoc tinh" (Nhat >=90%, Nhi >=75%, Ba >=60%, Khuyen khich >=45%) + the
required self-authored disclaimer ("de tu bien soan theo cau truc tham
khao - khong phai de thi chinh thuc; muc giai chi de tham khao").

Exam header shows the current section label under "Cau X/N".

## Out of scope

- Fixed forms (qb_exam_forms) - v1 generates fresh papers per sitting.
- Vong quoc gia / YLE-Cambridge structures - later rounds once v1 lands.
- Per-round leaderboards, teacher assignment of IOE rounds.
- Math-subject reuse (CR-128) - blueprints are english-only for now.

## Implementation

- `src/lib/exam/ioeBlueprint.ts` - round/section/award data + label type.
- `bank.ts` - `focus.ioeRound` branch in `createExamFromBank`:
  per-section fetch (1.6x oversample), concat, `examLabel` on state,
  seen-tracking keyed per round.
- `ExamState.examLabel` - optional section/award metadata.
- `StartBatchScreen` - IOE button + inline round chips (english only).
- `ExamScreen` - focus type + section chip in header.
- `ExamResult` - section table + award chip + disclaimer.

## Verification

- tsc + build + tests.
- Playwright: picker -> round -> exam runs all 4 sections, section chip
  updates per index, result shows section rows + award + disclaimer.
- Pool-short sections degrade gracefully (existing poolShort path).
