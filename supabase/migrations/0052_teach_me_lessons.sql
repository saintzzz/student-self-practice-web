-- CR-106 (0052): "Teach me" pre-answer lessons.
--
-- A student taps "Day toi" on a practice question before answering;
-- the server marks (account_id, question_id) taught, returns the
-- per-skill lesson (never the answer key), and the question becomes
-- ungraded for that account. The moat is preserved three ways:
--   1. teach_bank_question NEVER returns `answer`/`choices` key fields -
--      the payload is lesson text + explanation_vi only.
--   2. score_bank_attempts tags taught rows with 'taught': true so any
--      client knows the attempt is ungraded; keys still return because
--      a typed attempt already discloses them (0048 economics) - the
--      binding defenses are tbq_uid/sba_* caps + fetch exclusion.
--   3. fetch_questions__impl + fetch_questions_adaptive__impl exclude
--      taught rows for the caller: a disclosed row never re-serves for
--      grading. Guests are untouched (auth.uid() null -> no filter).
--
-- Scope (PO ruling in docs/sdlc/CR-106-teach-me-lessons.md): practice
-- mode only, authenticated accounts only, English subject lessons
-- keyed (skill, band) with band 1 = lop 1-2, band 2 = lop 3-5.

-- ---------- taught marks ----------

create table if not exists practice.taught_marks (
  account_id uuid not null references practice.accounts(id) on delete cascade,
  question_id text not null references practice.qb_questions(id) on delete cascade,
  taught_at timestamptz not null default now(),
  primary key (account_id, question_id)
);

create index if not exists taught_marks_question on practice.taught_marks(question_id);

-- Deny-all: only definer RPCs read/write marks. No policies = direct
-- client access fails; the table owner (definer) bypasses RLS.
alter table practice.taught_marks enable row level security;

revoke all on practice.taught_marks from public, anon, authenticated;

-- ---------- lesson content ----------

create table if not exists practice.skill_lessons (
  skill text not null,
  band smallint not null check (band in (0, 1, 2)),
  title_vi text not null,
  body_vi text not null,
  primary key (skill, band)
);

-- Private content table - the RPC is the only reader, so no grants.
alter table practice.skill_lessons enable row level security;
revoke all on practice.skill_lessons from public, anon, authenticated;

insert into practice.skill_lessons (skill, band, title_vi, body_vi) values
  ('vocabulary-in-context', 1, 'Đoán nghĩa từ trong câu',
   'Đọc cả câu, đừng chỉ nhìn từ lạ.' || chr(10) ||
   'Nghĩ xem câu đang nói về gì.' || chr(10) ||
   'Thử thay từng đáp án vào chỗ trống rồi đọc lại - câu nào có nghĩa nhất là đúng.' || chr(10) ||
   'Ví dụ: "The cat is ___ the box" - mèo ở TRONG hộp nên chọn "in".'),
  ('vocabulary-in-context', 2, 'Đoán nghĩa từ trong câu',
   'Đọc cả câu trước và sau chỗ trống.' || chr(10) ||
   'Ngữ cảnh quanh từ cho em manh mối về nghĩa.' || chr(10) ||
   'Thử thay từng đáp án vào chỗ trống rồi đọc lại - câu nào tự nhiên nhất là đúng.' || chr(10) ||
   'Cẩn thận từ gần nghĩa: chỉ có một từ hợp nghĩa của câu.'),
  ('vocabulary-recognition', 1, 'Nhận biết từ vựng',
   'Nhìn hình hoặc nghe, nghĩ tên tiếng Anh của nó.' || chr(10) ||
   'Đọc từng từ trong đáp án.' || chr(10) ||
   'Chọn từ đúng với hình hoặc nghĩa đã học.' || chr(10) ||
   'Ví dụ: hình con mèo - chọn "cat".'),
  ('vocabulary-recognition', 2, 'Nhận biết từ vựng',
   'Liên hệ từ với đúng hình ảnh hoặc nghĩa đã học.' || chr(10) ||
   'Đọc kỹ từng lựa chọn - có từ chỉ khác nhau vài chữ cái (ship/sheep).' || chr(10) ||
   'Loại trừ đáp án sai trước khi chọn đáp án cuối cùng.'),
  ('grammar-use-of-english', 1, 'Ngữ pháp trong câu',
   'Nhìn chủ ngữ đứng trước chỗ trống.' || chr(10) ||
   '"I" đi với "am", "you/we/they" đi với "are", "he/she/it" đi với "is".' || chr(10) ||
   'Đọc lại câu sau khi chọn - nghe êm tai là đúng.'),
  ('grammar-use-of-english', 2, 'Ngữ pháp trong câu',
   'Xác định chủ ngữ và thì của câu trước.' || chr(10) ||
   'Chủ ngữ ngôi ba số ít đi với động từ thêm "s" ở hiện tại đơn (he plays).' || chr(10) ||
   'Động từ bất quy tắc ở quá khứ phải nhớ riêng (go-went, have-had).' || chr(10) ||
   'Đọc lại câu hoàn chỉnh để kiểm tra nghe có tự nhiên không.'),
  ('reading', 1, 'Đọc hiểu',
   'Đọc đoạn văn từ đầu đến cuối, đừng vội.' || chr(10) ||
   'Câu hỏi hỏi gì thì tìm đúng chỗ đó trong bài.' || chr(10) ||
   'Đáp án đúng luôn nằm trong bài đọc, đừng đoán.'),
  ('reading', 2, 'Đọc hiểu',
   'Đọc lướt đoạn văn trước để nắm ý chính.' || chr(10) ||
   'Với câu hỏi chi tiết, quay lại tìm câu chứa từ khóa của câu hỏi.' || chr(10) ||
   'Với câu True/False, đối chiếu nguyên văn trong bài - đừng đoán theo cảm giác.'),
  ('listening', 1, 'Nghe hiểu',
   'Nghe kỹ từng từ, không cần hiểu hết.' || chr(10) ||
   'Bấm loa để nghe lại nếu chưa rõ.' || chr(10) ||
   'Từ nào nghe giống đáp án nào thì chọn đáp án đó.'),
  ('listening', 2, 'Nghe hiểu',
   'Nghe lần một để nắm ý chính, nghe lại để bắt chi tiết.' || chr(10) ||
   'Chú ý từ được nhấn mạnh và âm cuối của từ (-s, -ed, -ing).' || chr(10) ||
   'Nếu hai đáp án gần âm, nghe kỹ âm đầu và âm cuối.'),
  ('writing', 1, 'Viết câu',
   'Sắp xếp từ theo thứ tự câu đúng.' || chr(10) ||
   'Câu thường bắt đầu bằng chủ ngữ, rồi đến động từ.' || chr(10) ||
   'Chữ cái đầu câu viết hoa, cuối câu có dấu chấm.'),
  ('writing', 2, 'Viết câu',
   'Xác định chủ ngữ - động từ - tân ngữ trước khi sắp xếp.' || chr(10) ||
   'Trạng từ thời gian thường đứng cuối câu (yesterday, every day).' || chr(10) ||
   'Viết xong đọc lại xem câu đã đủ ý và đúng ngữ pháp chưa.'),
  ('phonics-pronunciation', 1, 'Âm và từ',
   'Nói nhẩm từng đáp án trong đầu.' || chr(10) ||
   'Từ nào có âm đầu hoặc âm vần giống yêu cầu thì chọn.' || chr(10) ||
   'Ví dụ: âm /b/ - chọn "ball", không chọn "cat".'),
  ('phonics-pronunciation', 2, 'Âm và từ',
   'Tách từ thành âm tiết rồi đối chiếu phần âm cần tìm.' || chr(10) ||
   'Chú ý các âm gần nhau: /p/-/b/, /s/-/sh/, /l/-/r/.' || chr(10) ||
   'Đọc to nhẩm từng đáp án giúp nghe rõ sự khác biệt.'),
  ('functional-language', 1, 'Ngôn ngữ giao tiếp',
   'Nghĩ xem người ta nói câu này trong tình huống nào.' || chr(10) ||
   'Chào hỏi dùng "Hello / Good morning", cảm ơn dùng "Thank you".' || chr(10) ||
   'Chọn câu lịch sự và hợp tình huống.'),
  ('functional-language', 2, 'Ngôn ngữ giao tiếp',
   'Xác định tình huống giao tiếp: chào hỏi, xin lỗi, hỏi đường, mời mọc.' || chr(10) ||
   'Câu đúng phải khớp tình huống VÀ đúng ngữ pháp.' || chr(10) ||
   'Ghi nhớ cụm cố định: "How are you?", "See you later", "Excuse me".'),
  ('speaking', 1, 'Nói',
   'Nói to, rõ ràng, từng từ một.' || chr(10) ||
   'Nhìn từ trước, nói sau.' || chr(10) ||
   'Đừng nói quá nhanh - máy nghe không rõ.'),
  ('speaking', 2, 'Nói',
   'Đọc lướt câu trước khi nói để biết trước các từ khó.' || chr(10) ||
   'Nói với nhịp đều, nhấn vào từ quan trọng.' || chr(10) ||
   'Nếu lỡ sai, bình tĩnh đọc lại lần nữa.'),
  ('count-and-name', 1, 'Đếm và gọi tên',
   'Đếm từng đồ vật trong hình, chỉ từng cái một.' || chr(10) ||
   'Sau khi đếm xong, đọc số đó bằng tiếng Anh.' || chr(10) ||
   'Ví dụ: 3 quả táo - "three apples".'),
  ('count-and-name', 2, 'Đếm và gọi tên',
   'Đếm cẩn thận, đánh dấu từng vật đã đếm để không đếm lại.' || chr(10) ||
   'Danh từ đếm được đi sau số phải thêm "s" (four cats).' || chr(10) ||
   'Kiểm tra lại: số cộng tên vật phải khớp với hình.')
on conflict (skill, band) do nothing;

-- ---------- teach RPC ----------

create or replace function practice.teach_bank_question(p_question_id text)
returns jsonb
language plpgsql
security definer
set search_path to 'practice', 'pg_catalog'
as $function$
declare
  v_uid uuid := auth.uid();
  v_q record;
  v_lesson record;
  v_band smallint;
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = 'PT401';
  end if;
  -- tbq_uid: 60/hr per account. A kid legitimately teaches a handful of
  -- skills per sitting; 60 blocks teach-all drain waves while staying
  -- invisible in normal play.
  if practice.check_rate_limit('tbq_uid:' || v_uid::text, 60, 3600) < 0 then
    raise exception 'rate_limited' using errcode = 'PT429';
  end if;

  select id, skill, grade, explanation_vi into v_q
    from practice.qb_questions
    where id = p_question_id;
  if not found then
    return jsonb_build_object(
      'question_id', p_question_id, 'taught', false, 'error', 'not_found');
  end if;

  insert into practice.taught_marks (account_id, question_id)
    values (v_uid, v_q.id)
    on conflict (account_id, question_id) do nothing;

  v_band := case when v_q.grade <= 2 then 1 else 2 end;
  select skill, band, title_vi, body_vi into v_lesson
    from practice.skill_lessons
    where skill = v_q.skill and band in (v_band, 0)
    order by band desc
    limit 1;

  return jsonb_build_object(
    'question_id', v_q.id,
    'taught', true,
    'skill', v_q.skill,
    'title_vi', v_lesson.title_vi,
    'body_vi', v_lesson.body_vi,
    'explanation_vi', v_q.explanation_vi);
end;
$function$;

revoke all on function practice.teach_bank_question(text) from public, anon;
grant execute on function practice.teach_bank_question(text)
  to authenticated, service_role;

-- ---------- scoring oracle: tag taught rows ----------

create or replace function practice.score_bank_attempts(p_attempts jsonb)
returns setof jsonb
language plpgsql
security definer
set search_path to 'practice', 'pg_catalog'
as $function$
declare
  v_uid text := coalesce(auth.uid()::text, 'anon');
  v_n int := greatest(1, case when jsonb_typeof(coalesce(p_attempts, '[]'::jsonb)) = 'array'
                              then jsonb_array_length(p_attempts) else 1 end);
  v_att jsonb;
  v_q record;
  v_correct boolean;
  v_text text;
  v_expected boolean;
  v_choice jsonb;
  v_typed boolean;
  v_taught boolean;
begin
  if auth.role() <> 'service_role' then
    if auth.uid() is not null then
      if practice.check_rate_limit('sba_uid_calls:' || v_uid, 200, 3600) < 0
         or practice.check_rate_limit_weighted('sba_uid:' || v_uid, v_n, 800, 3600) < 0 then
        raise exception 'rate_limited' using errcode = 'PT429';
      end if;
    elsif practice.check_rate_limit('sba_guest_calls', 400, 3600) < 0
       or practice.check_rate_limit_weighted('sba_guest', v_n, 2000, 3600) < 0 then
      raise exception 'rate_limited' using errcode = 'PT429';
    end if;
  end if;

  if jsonb_typeof(p_attempts) is distinct from 'array' then
    return;
  end if;

  for v_att in select * from jsonb_array_elements(p_attempts)
  loop
    select id, question_type, choices, answer, explanation_vi
      into v_q
      from practice.qb_questions
      where id = v_att->>'question_id';
    if not found then
      return query select jsonb_build_object(
        'question_id', v_att->>'question_id',
        'correct', false, 'correct_answer', null,
        'correct_answer_text', null, 'explanation_vi', null);
      continue;
    end if;

    -- CR-106: tag taught rows. Grading still runs (fixed-form sittings
    -- must not lose scored items); the flag lets the client mark the
    -- attempt ungraded.
    v_taught := auth.uid() is not null and exists (
      select 1 from practice.taught_marks tm
      where tm.account_id = auth.uid() and tm.question_id = v_q.id);

    v_correct := false;
    v_text := null;
    v_typed := false;
    case v_q.question_type
      when 'mcq', 'image-to-word-mcq', 'word-to-image-mcq', 'visual-mcq', 'visual-count-mcq' then
        v_typed := jsonb_typeof(v_att->'response'->'index') = 'number';
        v_correct := v_typed and (v_att->'response'->>'index')::int = (v_q.answer->>'index')::int;
        v_choice := v_q.choices -> ((v_q.answer->>'index')::int);
        v_text := case jsonb_typeof(v_choice)
          when 'object' then coalesce(v_choice->>'text', v_choice->>'label', v_choice->>'word', v_choice->>'assetId')
          else btrim(v_choice::text, '"') end;
      when 'true-false' then
        v_typed := jsonb_typeof(v_att->'response'->'bool') = 'boolean';
        v_expected := coalesce(
          (v_q.answer->>'boolean')::boolean,
          case when v_q.answer ? 'text'
               then lower(v_q.answer->>'text') = 'true' end,
          case when v_q.choices->>0 = 'True' and v_q.choices->>1 = 'False'
               then (v_q.answer->>'index')::int = 0 end);
        v_correct := v_typed and (v_att->'response'->>'bool')::boolean = v_expected;
        v_text := case when v_expected then 'True' else 'False' end;
      when 'text-answer' then
        v_typed := jsonb_typeof(v_att->'response'->'text') = 'string';
        v_correct := v_typed and (
          (practice.bank_norm_answer(v_att->'response'->>'text')
            = practice.bank_norm_answer(v_q.answer->>'text')) is true
          or exists (
            select 1 from jsonb_array_elements_text(
              coalesce(v_q.answer->'accepted', '[]'::jsonb)) x
            where (practice.bank_norm_answer(x)
                  = practice.bank_norm_answer(v_att->'response'->>'text')) is true)
        );
        v_text := coalesce(v_q.answer->>'text', v_q.answer->'accepted'->>0);
      when 'reorder' then
        -- typed = string text OR a picked array (presence alone is not
        -- enough: {"text":null} / {"text":false} must NOT pass the gate).
        v_typed := jsonb_typeof(v_att->'response'->'text') = 'string'
                or jsonb_typeof(v_att->'response'->'picked') = 'array';
        v_correct := v_typed and (practice.bank_norm(
                       coalesce(v_att->'response'->>'text',
                         (select string_agg(x.word, ' ' order by x.ord)
                            from jsonb_array_elements_text(
                              coalesce(v_att->'response'->'picked', '[]'::jsonb))
                            with ordinality as x(word, ord))))
                     = practice.bank_norm(v_q.answer->>'text')) is true;
        v_text := v_q.answer->>'text';
      else
        v_correct := false;
    end case;

    return query select jsonb_build_object(
      'question_id', v_q.id,
      'correct', coalesce(v_correct, false),
      'correct_answer', case when v_typed then v_q.answer else null end,
      'correct_answer_text', v_text,
      'explanation_vi', v_q.explanation_vi,
      'taught', v_taught);
  end loop;
  return;
end;
$function$;

revoke all on function practice.score_bank_attempts(jsonb) from public;
grant execute on function practice.score_bank_attempts(jsonb) to anon, authenticated, service_role;

-- ---------- fetch exclusion: never re-serve taught rows for grading ----------

create or replace function practice.fetch_questions__impl(
  p_grade smallint, p_subject text, p_count integer DEFAULT 20,
  p_skills text[] DEFAULT NULL::text[], p_min_difficulty smallint DEFAULT NULL::smallint,
  p_mode text DEFAULT 'practice'::text)
returns setof jsonb
language plpgsql
stable
security definer
set search_path to 'practice', 'pg_catalog'
as $function$
declare
  n int := greatest(1, least(p_count, 200));
  got int := 0;
  seen text[] := '{}';
  rec record;
begin
  for rec in
    select t.* from (
      select distinct on (coalesce(q.variant_group_id, q.id)) q.*
      from practice.qb_questions q
      where q.grade = p_grade
        and q.subject = p_subject
        and q.canonical
        and (p_skills is null or q.skill = any(p_skills))
        and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
        and question_type not in ('constructed-response', 'speaking-prompt')
        and q.review_status not in ('rejected', 'draft')
        and (q.publication_policy->>'commercialReleaseEligible')::boolean
        and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
        and case when p_mode = 'exam'
              then (q.publication_policy->>'examEligible')::boolean
                 and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
              when p_mode = 'mock'
              then (q.publication_policy->>'mockEligible')::boolean
                 and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
              else (q.publication_policy->>'practiceEligible')::boolean
            end
        and random() < 0.35
        -- CR-106: disclosed rows never re-serve for grading. anon
        -- callers (auth.uid() null) keep the full pool.
        and (auth.uid() is null
             or not exists (select 1 from practice.taught_marks tm
                            where tm.account_id = auth.uid()
                              and tm.question_id = q.id))
      order by coalesce(q.variant_group_id, q.id), random()
    ) t
    order by random()
    limit n
  loop
    got := got + 1;
    seen := seen || coalesce(rec.variant_group_id, rec.id);
    return next to_jsonb(rec) || jsonb_build_object(
      'asset_paths', coalesce((
        select jsonb_agg(a.file_path order by qa.sort_order)
        from practice.qb_question_assets qa
        join practice.qb_assets a on a.id = qa.asset_id
        where qa.question_id = rec.id), '[]'::jsonb),
      'audio_transcripts', coalesce((
        select jsonb_agg(aa.transcript)
        from practice.qb_question_audio qau
        join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
        where qau.question_id = rec.id), '[]'::jsonb));
  end loop;

  if got < n then
    for rec in
      select t.* from (
        select distinct on (coalesce(q.variant_group_id, q.id)) q.*
        from practice.qb_questions q
        where q.grade = p_grade
          and q.subject = p_subject
          and q.canonical
          and (p_skills is null or q.skill = any(p_skills))
          and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
          and question_type not in ('constructed-response', 'speaking-prompt')
          and q.review_status not in ('rejected', 'draft')
          and (q.publication_policy->>'commercialReleaseEligible')::boolean
          and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
          and case when p_mode = 'exam'
                then (q.publication_policy->>'examEligible')::boolean
                   and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
                when p_mode = 'mock'
                then (q.publication_policy->>'mockEligible')::boolean
                   and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
                else (q.publication_policy->>'practiceEligible')::boolean
              end
          and not (coalesce(q.variant_group_id, q.id) = any(seen))
          and (auth.uid() is null
               or not exists (select 1 from practice.taught_marks tm
                              where tm.account_id = auth.uid()
                                and tm.question_id = q.id))
        order by coalesce(q.variant_group_id, q.id), random()
      ) t
      order by random()
      limit n - got
    loop
      return next to_jsonb(rec) || jsonb_build_object(
        'asset_paths', coalesce((
          select jsonb_agg(a.file_path order by qa.sort_order)
          from practice.qb_question_assets qa
          join practice.qb_assets a on a.id = qa.asset_id
          where qa.question_id = rec.id), '[]'::jsonb),
        'audio_transcripts', coalesce((
          select jsonb_agg(aa.transcript)
          from practice.qb_question_audio qau
          join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
          where qau.question_id = rec.id), '[]'::jsonb));
    end loop;
  end if;
  return;
end;
$function$;

create or replace function practice.fetch_questions_adaptive__impl(
  p_grade smallint,
  p_subject text,
  p_count int default 20,
  p_skills text[] default null,
  p_min_difficulty smallint default null,
  p_mode text default 'practice'
)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = practice, pg_catalog
as $$
declare
  n int := greatest(1, least(p_count, 200));
  rec record;
begin
  for rec in
    with last_outcomes as (
      select q2.skill, e.is_correct,
             row_number() over (partition by q2.skill
                                order by e.answered_at desc) as rn
      from practice.qb_attempt_events e
      join practice.qb_questions q2 on q2.id = e.question_id
      where e.learner_id = auth.uid()
    ),
    target as (
      select skill,
             case
               when count(*) < 10 then 3
               when avg(is_correct::int) < 0.5 then 2
               when avg(is_correct::int) >= 0.85 then 4
               else 3
             end as zpd_target
      from last_outcomes
      where rn <= 30
      group by skill
    ),
    pool as (
      -- Per variant-group keep the variant closest to the learner's
      -- target difficulty (random tiebreak), same dedup rule as
      -- fetch_questions__impl.
      select distinct on (coalesce(q.variant_group_id, q.id))
             q.*, coalesce(t.zpd_target, 3) as zpd_target
      from practice.qb_questions q
      left join target t on t.skill = q.skill
      where q.grade = p_grade
        and q.subject = p_subject
        and q.canonical
        and (p_skills is null or q.skill = any(p_skills))
        and (p_min_difficulty is null or q.difficulty >= p_min_difficulty)
        and question_type not in ('constructed-response', 'speaking-prompt')
        and q.review_status not in ('rejected', 'draft')
        and (q.publication_policy->>'commercialReleaseEligible')::boolean
        and (q.publication_policy->>'requiresHumanApprovalForCommercialRelease')::boolean is not true
        and case when p_mode = 'exam'
              then (q.publication_policy->>'examEligible')::boolean
                 and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
              when p_mode = 'mock'
              then (q.publication_policy->>'mockEligible')::boolean
                 and (q.publication_policy->>'requiresHumanApprovalForExam')::boolean is not true
              else (q.publication_policy->>'practiceEligible')::boolean
            end
        -- CR-106: same taught exclusion as fetch_questions__impl.
        and (auth.uid() is null
             or not exists (select 1 from practice.taught_marks tm
                            where tm.account_id = auth.uid()
                              and tm.question_id = q.id))
      order by coalesce(q.variant_group_id, q.id),
               abs(q.difficulty - coalesce(t.zpd_target, 3)),
               random()
    )
    select * from pool
    order by (abs(pool.difficulty - pool.zpd_target) > 1),
             abs(pool.difficulty - pool.zpd_target),
             random()
    limit n
  loop
    -- zpd_target is internal - strip it, then attach the same
    -- asset/transcript enrichment fetch_questions__impl emits.
    return next (to_jsonb(rec) - 'zpd_target') || jsonb_build_object(
      'asset_paths', coalesce((
        select jsonb_agg(a.file_path order by qa.sort_order)
        from practice.qb_question_assets qa
        join practice.qb_assets a on a.id = qa.asset_id
        where qa.question_id = rec.id), '[]'::jsonb),
      'audio_transcripts', coalesce((
        select jsonb_agg(aa.transcript)
        from practice.qb_question_audio qau
        join practice.qb_audio_assets aa on aa.audio_asset_id = qau.audio_asset_id
        where qau.question_id = rec.id), '[]'::jsonb));
  end loop;
  return;
end;
$$;

revoke all on function practice.fetch_questions_adaptive__impl(smallint, text, int, text[], smallint, text)
  from public, anon, authenticated;
