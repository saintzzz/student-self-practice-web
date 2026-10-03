# CR-49 - V7 Assessment Intelligence (feasible subset) + V8 roadmap

Status: APPROVED SCOPE (PO ruling) - trien khai slice 1 sau CR-48.
Nguon: PRODUCT-DECISION-V7-V8.md, V7/V8-REQUIREMENTS.md,
requirements-v7-v8.json (primary-question-bank folder).

## Danh gia (PO)

V7/V8 KHONG phai "them 2 version cau hoi" - day la 2 release program:
- V7 = Assessment Intelligence: lifecycle review, immutable versions,
  curriculum graph, attempt events, mastery, adaptive, psychometrics,
  secure assembly, analytics, AI governance.
- V8 = Institutional platform: QTI/LTI/OneRoster/Caliper/SSO/
  multi-tenant/privacy-law - chuong trinh enterprise, can LMS thuat +
  pilot truong that de conformance-test.

Khong the "implement V7/V8" trong 1 CR. Cach dung: tach slice kha thi
map len stack hien tai, giu cau truc de V8 khong phai viet lai.

## PO rulings

1. V7 lam theo slice, khong fake: psychometrics/IRT chi chay
   "shadow mode" cho toi khi co du lieu pilot that. Khong duoc hien
   thi so lieu chinh xac gia (no false precision).
2. V8 DEFER - trigger: it nhat 1 truong pilot that yeu cau SSO/LMS
   integration hoac procurement doi hoi standards. Khong build QTI/
   LTI/OneRoster/Caliper truoc nhu cau that.
3. Khong dinh nghia V9 toi khi co bang chung pilot + psychometric data.
4. Official/high-stakes examEligible chi mo boi nguoi duyet co tham
   quyen - AI khong bao gio tu approve.

## Da co san sau CR-48 (V7 subset shipped)

| V7 req | Trang thai |
|---|---|
| AR lifecycle review (approve/reject/flag + eligibility gate) | DONE - `review_question` + tab "Duyet cau hoi" |
| AR-002 review history + actor + reason + timestamp | DONE - `qb_review_events` |
| ASM deterministic form replay | DONE - `fetch_form` + FormPicker (270 forms) |
| Eligibility gate server-side (practice/mock/exam) | DONE - `publicationPolicy` enforced trong RPC |
| Rights governance (reference-only harvested) | DONE - Phase 4 choke points + invariant tests |

## Slice 1 - V7 buildable now [DONE - verified E2E]

Da ship (migration 0017 + src/lib/qb/telemetry.ts):

1. **Attempt events immutable** [DONE] - `qb_attempt_events` append-
   only, idempotent qua `client_event_id` unique; batch RPC
   `record_attempt_events`; moi cau tra loi o moi mode (practice/mock/
   form/arena/review) ghi question_id + is_correct + latency_ms +
   session_id. Verify: tra loi that tren dev -> rows + stats view co
   data.
2. **Item statistics** [DONE] - view `qb_item_stats` (attempts,
   learners, facility, avg latency) tu du lieu that; hien trong review
   queue card. KHONG fake discrimination/IRT - chi facility thuc do.
3. **Assessment snapshot** [DONE] - `results.form_id` +
   `results.question_snapshot` (questionIds tai thoi diem thi).
4. **Adaptive shadow mode** [DONE] - `qb_adaptive_decisions`, naive
   explainable policy (rolling accuracy -> difficulty 1/2/3),
   shadow=true, KHONG anh huong selection. Deterministic tests pin
   contract (telemetry.test.ts).
5. **Audit mo rong** [DONE] - `practice.audit_log`; review_question gio
   ghi ca review_events + audit_log.

Khong lam trong slice 1: curriculum graph editor, IRT calibration,
rubric scoring UI, AI generation runs, mastery dashboard - deu can data
pilot hoac scope rieng.

## V8 roadmap (khong build)

Trigger checklist truoc khi mo V8:
- [ ] >=1 truong pilot ky MOU, yeu cau SSO hoac LMS integration
- [ ] Procurement questionnaire doi hoi QTI/OneRoster/Caliper
- [ ] Privacy/legal review cho du lieu tre em tai truong
- [ ] >=3 thang telemetry pilot de dinh hinh SLO

Khi trigger: mo CR V8 rieng, uu tien OneRoster CSV + SSO truoc
(de nhat trong tap standards), QTI/LTI sau.

## Impact assessment

- DB: +3 bang (attempt_events, adaptive_decisions, audit_log) - append
  heavy, index theo (learner, question, session). Khong doi schema V6.
- Client: ExamScreen emit event per answer; review card them cot stats;
  khong doi flow cho tre em.
- Performance: attempt insert async, khong chan UI (fire-and-forget +
  retry queue trong engagement store).
- Privacy: attempt_events gan learner pseudonymous (auth.users id),
  khong luu PII text.
