# Polish Wave 1012 - Post-hoc Verification (r130 follow-up)

Wave: 1,012 `explanation_vi` rows rewritten by `polish-explanations.mjs`
(codex batches) restoring Vietnamese diacritics + natural grammar.

## Known limitation (r130#2)

The original run wrote edits directly to the DB without a before/after
snapshot, so the undiacritized originals are not recoverable and the edits
cannot be replayed from an artifact. The script has been rewritten as a
two-phase pipeline (proposals -> reviewable `polish-edits-*.jsonl` artifact
-> `--apply` replay) so every future wave carries its own audit trail.

## Verification performed on live data (post-apply)

1. **Answer-consistency scan (all 132,663 rows).** For every MCQ row the
   correct label was resolved and cross-checked against the explanation.
   No polished explanation was found arguing for a distractor - all 483
   rows whose explanation quotes a non-correct choice do so as
   distractor-contrast pedagogy ("'Eight' (tám) sai vì có 10 ngôi nhà"),
   which is correct teaching.

2. **Real defect discovered and fixed.** The scan surfaced an
   `answer.index` vs `answer.text` drift class the audit missed: 9 rows
   where grading (index) disagreed with the stored answer text, 3 of them
   actively served. Fixed by migration `0065_fix_answer_index_mismatch.sql`
   (verified live: all 9 now consistent) and guarded permanently by the
   new P0 check `answer-index-text-mismatch` in `qb-content-audit.mjs`.

3. **Quality spot checks.** Samples verified natural, correct Vietnamese:
   - "Yesterday cho biết việc đã xảy ra trong quá khứ. Động từ 'see' có
     dạng quá khứ bất quy tắc là 'saw'. Các lựa chọn khác không đúng."
   - "So sánh sông Mekong với một con suối nên dùng dạng so sánh hơn
     'longer'. 'longest' là dạng so sánh nhất. 'more long' sai vì tính từ
     ngắn này cần thêm '-er'."

4. **Audit re-run after wave:** `explanation-not-vietnamese` = 0 (VN_MARK
   regex broadened to explicit uppercase marks to match the polish script).

## Residual risk

Without the original snapshot, term-preservation cannot be re-verified
mechanically for this wave; it was instead bounded by the resolved-answer
consistency scan above plus manual spot checks. The standing 5% human
academic spot-check remains the final gate for this content class.
