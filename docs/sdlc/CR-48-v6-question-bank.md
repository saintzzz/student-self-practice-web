# CR-48: Primary Question Bank V6 - DB-backed canonical bank thay the toan bo bank cu

## What / Why

Founder cung cap `primary-question-bank-v6-final` (Desktop) - bank moi
do doi content define, **11,406 cau**, quality-report PASS. Quyet dinh
cua founder: **DB-backed, V6 thay the hoan toan bank cu**.

V6 khong chi la "nhieu cau hon" - no dinh nghia mot pattern he thong
ma app hien tai khong co:

- `publicationPolicy` per question (practice/mock/exam/commercial
  eligible + rightsStatus) - giai quyet dung ruling ban quyen da chot
  (harvested IOE/Violympic nam `archive/` = reference-only, khong bao
  gio vao commercial pool).
- `variantGroupId` - khong lap cung nhom bien the trong 1 de.
- `curriculumAlignment` - MOET-2018 truc chinh, Global Success theme
  map (G3-5), Cambridge 0057/0096/0097 enrichment.
- 135 assessment blueprints + **270 forms dung san** (unit test,
  diagnostic, midterm, final).
- `academic_review_queue` (627 items) - workflow duyet cau truoc khi
  vao de that.
- `contentHash` - import idempotent.

## Danh gia bank (artifact nay la impact assessment)

| | V6 | Bank cu |
|---|---|---|
| Tong cau | 11,406 | ~7,300 materialized |
| English G1-5 | 650-1,559/khoi, day du moi khoi | G1/G3 thieu MCQ IOE |
| Toan TA | 712 x 5 khoi | chi G2 that |
| KH TA | 402 x 5 khoi | 0 cau (gap P0) |
| Anh | 1,455 assets + question-image map | 843 anh Violympic |
| Audio | 362 WAV eSpeak (dev-grade, transcript canonical) | runtime TTS |

Type inventory V6: mcq 6110, image-to-word-mcq 1462,
word-to-image-mcq 1462, text-answer 1028, true-false 551,
constructed-response 249, reorder 215, visual-mcq 120,
speaking-prompt 109, visual-count-mcq 100.

Caveats da danh gia:
- `constructed-response` + `speaking-prompt` (358 cau) la rubric-mode,
  KHONG tu cham duoc -> phase dau loai khoi pool auto-score.
- WAV la eSpeak robot voice -> KHONG import audio files; giu
  transcript, app tiep tuc dung browser/neural TTS.
- Bank cu (ioeRealBank, vioMathBank, generators, vocabulary) retire
  theo lua chon founder; anh Violympic harvest bi loai khoi commercial
  pool dung theo legal ruling.

## Scope - phased

### Phase 1 - DB schema + import pipeline (CR nay)

- Migration `0013_question_bank_v6.sql` trong schema `practice`:
  - `practice.qb_assets` (id, kind, file_path, alt_text, rights_status,
    metadata)
  - `practice.qb_questions` theo schema-v6.sql (grade, subject, domain,
    skill, question_type, difficulty, topic_key, prompt_text,
    transcript, choices jsonb, answer jsonb, explanation_vi,
    learning_objective, curriculum_alignment jsonb, tags jsonb,
    canonical, variant_group_id, rights_status, review_status,
    publication_policy jsonb, content_hash, source jsonb) + indexes
    (grade+subject, topic_key, variant_group, GIN alignment)
  - `practice.qb_question_assets` (question_id, asset_id, sort_order)
  - `practice.qb_audio_assets` + `practice.qb_question_audio`
    (metadata + transcript only; khong import WAV)
  - `practice.qb_exam_blueprints` + `practice.qb_exam_forms`
  - `practice.qb_review_queue`
  - RLS: select cho `authenticated` (cau hoi luyen tap khong bi mat -
    hien bank da ship trong JS bundle); write chi service_role.
- Import script `scripts/import-v6-bank.mjs`: doc JSONL + maps, batch
  upsert qua service_role, idempotent theo id + content_hash; copy
  1,455 images -> `public/images/v6/**` giu relative path.
- Verify: count per grade/subject khop quality-report.

### Phase 2 - question-serving layer

- RPC `practice.fetch_questions(p_grade, p_subject, p_count,
  p_mode)` - random co trong so difficulty, ton trong
  publicationPolicy (practice vs mock), loai tru variantGroupId trung
  trong 1 fetch, loai rubric-type khoi auto-score pool.
- RPC `practice.fetch_form(p_form_id)` - tra danh sach cau dung thu tu
  cua 270 forms.
- Client adapter: map V6 question -> ExamQuestion/PracticeQuestion
  shape hien co.

### Phase 3 - type mapping + renderer

- mcq/true-false/text-answer/reorder -> renderer co san.
- image-to-word-mcq, word-to-image-mcq, visual-mcq,
  visual-count-mcq -> image-choice pattern co san (anh tu
  /images/v6/**).
- constructed-response/speaking-prompt -> giai doan nay exclude khoi
  pool auto-score; danh dau rubric cho phase sau.

### Phase 4 - retire bank cu

- Xoa/ngung dung: ioeRealBank, ioeBanks, vioMathBank, scienceBank,
  readingBank, reorderBank, grammarBank, vocabulary/, generators.
- export-question-bank.mjs chuyen sang export tu DB V6.

### Phase 5 - forms engine + review queue

- UI "De theo don vi" dung qb_exam_forms; mode mock ton trong
  variantGroupId.
- AdminScreen: review queue tab (627 items) - approve/reject cap nhat
  review_status + publicationPolicy.examEligible.

## Rulings da chot (founder)

1. DB-backed - Supabase `practice` schema la source of truth.
2. V6 thay the hoan toan bank cu - khong merge.
3. Khong import WAV eSpeak - transcript canonical, app giu TTS.
4. Rubric-type cau (speaking/constructed-response) khong vao pool
   auto-score o phase dau.

## Risks

- Bundle size giam dang ke (bo ~7k cau khoi JS) nhung app phu thuoc
  mang cho question fetch - guest/offline practice can fallback hoac
  pre-cache. Mitigate: fetch per-session, cache trong session.
- 11,406 rows x jsonb - fetch RPC phai chi tra fields can thiet.
- RLS: khong expose examEligible=false content cho endpoint "thi that"
  sau nay; hien tai chi practice/mock.
