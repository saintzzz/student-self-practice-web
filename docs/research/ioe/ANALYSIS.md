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

## Answer recovery (corrected 2026-10-02)

- **`orderTrue` is NOT the answer key.** It is the tile/option's
  shuffled display position. Disproved with known items: "Paris" in
  "Which city is NOT in Viet Nam?" has orderTrue=2 but is correct;
  "It's in April." has orderTrue=0. The earlier min-orderTrue
  hypothesis was coincidental.
- Reorder (type 5): sorting tiles by `orderTrue` reconstructs the
  correct sentence - this IS ground truth for that type only.
- Make-word (type 25): `ans[]` chunks contain distractor chunks too;
  solve by dictionary subset (all 20 solved by hand).
- MCQ (type 10): payload carries no answer marker at all. The game
  validates via `/ioe-service/v2/game/answercheck` using a JWT minted
  after `startgame` (URL token is not the API token; it lives in
  `localStorage["GAME_*_tokenFull"]`). We hand-solved 284 text MCQs
  into `mcq-answers.json` instead - faster and deterministic.
- Fill-in (type 2): `game.ans` is a partial flat key; masked word +
  `numTChar` + sentence context solved the rest (hand overrides in
  `scripts/ioe-convert-all.mjs`).
- T/F (type 1): no marker; only text-passage items kept
  (TF_ANSWERS), image/audio passages dropped.

## Harvesting all grades (2026-10-02 results)

- Per-grade accounts registered via Playwright on edu.go.vn (no OTP);
  each account is locked to its registered Khối. Tu luyện (free)
  harvested for G1, G2, G3, G4, G5 via `game/getinfo` route capture;
  Thi thử (paid) harvested for G4 only (accounts without a package
  get paywalled at `TuLuyen/setinfo`).
- `all-raw.json` totals: G1 46, G2 46, G3 105, G4 878, G5 115.
- Tu luyện rounds unlock sequentially (`current_round=1`); later
  rounds return "vòng thi chưa mở". Vòng-1 banks are small
  (~46-115 unique per grade) - extra harvest passes hit diminishing
  returns.
- `scripts/ioe-convert-all.mjs` produces `src/data/ioeRealBank.ts`
  (per-grade banks: mcq/reorder/masked/makeWord/listen/tf). Usable
  totals: G4 = 277 mcq + 219 masked + 123 reorder + 15 tf; G3 = 31
  reorder + 17 listen; G5 = 29 reorder + 18 listen; G1/G2 =
  masked/makeWord + listen.

## Violympic (Toán tiếng Anh / Khoa học tự nhiên)

- `violympic.vn` has exactly the two subjects we need plus free
  "Thi thử - Luyện tập". Registration is a 3-step MUI flow
  automatable up to the final step, but it **requires email + phone
  number** (likely OTP) - not provisioned. To harvest: register an
  account manually (or hand over creds), then the same route-capture
  pattern applies (their API is GraphQL on `violympic.vn/graphql` -
  observed during registration).

## Copyright note

IOE's bank is proprietary. Use harvested items to calibrate difficulty,
patterns and distractor style - author our own equivalent items rather
than shipping theirs verbatim.
