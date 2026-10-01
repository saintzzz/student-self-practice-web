# IOE exam payload analysis (Cấp Phường - Khối 4, 2026-10-01)

Source: live `POST /ioe-service/v2/thithu/getinfo` response captured in
`ioe-thithu-cap-phuong-g4.json` (151KB, full exam).

## Payload shape

```
data.game.question[]   200 questions, each:
  .id            - stable question id (dedup key across harvests)
  .type          - 1=T/F, 2=fill-in masked word, 5=reorder, 10=MCQ
  .Point         - 10
  .Description   - .content holds image URL (dataType=1) or audio URL
                   (dataType=2) or empty
  .content.content - the prompt text
  .ans[]         - options / tiles; `orderTrue` is the key field
  .numTChar      - type-2: number of missing letters
data.game.ans[]  - partial answer key (25 entries, fill-in answers;
                   join order still TBD - residual questions solvable
                   from mask + context)
```

## Question distribution (this exam)

| type | count | share | meaning |
|------|-------|-------|---------|
| 10   | 104   | 52%   | MCQ: grammar, vocab, image-choice, listening (audio URL), reorder-as-choice |
| 2    | 57    | 29%   | fill-in masked word (`Aus******` + numTChar=6 -> `tralia`) |
| 5    | 31    | 15%   | reorder tiles into a sentence |
| 1    | 8     | 4%    | True/False statement |

41 questions carry image URLs, 20 carry audio URLs - media on CDN
`cdn-s3.vtconline.vn/ioe-resource-02/...`.

## Answer recovery (verified on this dump)

- MCQ: the option with the **minimum `orderTrue`** (0 or 1) is the
  correct answer - confirmed against obvious items ("It's in April",
  "His", "Can Luca's brother roller skate?"). 104/104 recoverable.
- Reorder: sorting tiles by `orderTrue` reconstructs the sentence
  ("Her old school is small."). 31/31 recoverable.
- Fill-in: `game.ans` carries a partial key; masked word + `numTChar`
  + sentence context make the rest deterministic.
- T/F: no marker in payload - solve from the statement text.

## Harvesting all grades

- The account is **locked to Khối 4** - "Khối lớp 4" selector is
  display-only. Other grades require accounts registered under those
  grades.
- Each `Vào thi ngay`/`Làm lại` entry yields a fresh `getinfo`
  payload; pools reshuffle so repeated runs accumulate coverage.
  Dedup by `question.id`.
- `scripts/ioe-harvest.mjs` automates: login once (storage state
  reused), loop 4 levels x N runs, dump every distinct payload.
- Tự luyện rounds expose a separate endpoint family (`tuluyen/...`),
  same capture pattern applies.

## Copyright note

IOE's bank is proprietary. Use harvested items to calibrate difficulty,
patterns and distractor style - author our own equivalent items rather
than shipping theirs verbatim.
