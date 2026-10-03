-- CR-48 Phase 1: V6 canonical question bank trong schema `practice`.
-- Theo reference sql/schema-v6.sql cua bank; prefix qb_ de khong dung
-- ten generic. Read-only cho authenticated (bank da public trong JS
-- bundle truoc day); ghi chi qua service_role (import pipeline).

create table if not exists practice.qb_assets (
  id text primary key,
  kind text,
  file_path text not null,
  alt_text text,
  rights_status text not null,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists practice.qb_questions (
  id text primary key,
  grade smallint not null check (grade between 1 and 5),
  subject text not null check (subject in ('english','math','science')),
  domain text,
  skill text not null,
  question_type text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  topic_key text,
  prompt_text text not null,
  transcript text,
  choices jsonb,
  answer jsonb not null,
  explanation_vi text,
  learning_objective text,
  curriculum_alignment jsonb not null,
  tags jsonb,
  canonical boolean not null default true,
  variant_group_id text,
  rights_status text not null,
  review_status text,
  publication_policy jsonb not null,
  content_hash text,
  source jsonb,
  schema_version text
);
create index if not exists idx_qb_questions_grade_subject
  on practice.qb_questions(grade, subject);
create index if not exists idx_qb_questions_topic
  on practice.qb_questions(topic_key);
create index if not exists idx_qb_questions_variant_group
  on practice.qb_questions(variant_group_id);
create index if not exists idx_qb_questions_alignment_gin
  on practice.qb_questions using gin(curriculum_alignment);
create index if not exists idx_qb_questions_policy_gin
  on practice.qb_questions using gin(publication_policy);

create table if not exists practice.qb_question_assets (
  question_id text references practice.qb_questions(id) on delete cascade,
  asset_id text references practice.qb_assets(id) on delete restrict,
  sort_order smallint not null default 0,
  primary key (question_id, asset_id)
);

create table if not exists practice.qb_audio_assets (
  audio_asset_id text primary key,
  file_path text not null,
  mime_type text not null,
  transcript text not null,
  grade smallint,
  voice text,
  speaking_rate_wpm integer,
  rights_status text,
  commercial_eligible text
);

create table if not exists practice.qb_question_audio (
  question_id text not null references practice.qb_questions(id) on delete cascade,
  audio_asset_id text not null references practice.qb_audio_assets(audio_asset_id),
  primary key (question_id, audio_asset_id)
);

create table if not exists practice.qb_exam_blueprints (
  id text primary key,
  payload jsonb not null
);

create table if not exists practice.qb_exam_forms (
  id text primary key,
  blueprint_id text,
  grade smallint,
  subject text,
  kind text,
  mode text,
  payload jsonb not null
);
create index if not exists idx_qb_exam_forms_grade_subject
  on practice.qb_exam_forms(grade, subject);

create table if not exists practice.qb_review_queue (
  question_id text primary key references practice.qb_questions(id) on delete cascade,
  priority text not null,
  issues jsonb not null,
  review_status text not null default 'pending',
  reviewer_id text,
  reviewed_at timestamptz
);

alter table practice.qb_assets enable row level security;
alter table practice.qb_questions enable row level security;
alter table practice.qb_question_assets enable row level security;
alter table practice.qb_audio_assets enable row level security;
alter table practice.qb_question_audio enable row level security;
alter table practice.qb_exam_blueprints enable row level security;
alter table practice.qb_exam_forms enable row level security;
alter table practice.qb_review_queue enable row level security;

create policy qb_assets_select on practice.qb_assets
  for select to authenticated using (true);
create policy qb_questions_select on practice.qb_questions
  for select to authenticated using (true);
create policy qb_question_assets_select on practice.qb_question_assets
  for select to authenticated using (true);
create policy qb_audio_assets_select on practice.qb_audio_assets
  for select to authenticated using (true);
create policy qb_question_audio_select on practice.qb_question_audio
  for select to authenticated using (true);
create policy qb_exam_blueprints_select on practice.qb_exam_blueprints
  for select to authenticated using (true);
create policy qb_exam_forms_select on practice.qb_exam_forms
  for select to authenticated using (true);
create policy qb_review_queue_select on practice.qb_review_queue
  for select to authenticated using (true);

grant select on practice.qb_assets to authenticated;
grant select on practice.qb_questions to authenticated;
grant select on practice.qb_question_assets to authenticated;
grant select on practice.qb_audio_assets to authenticated;
grant select on practice.qb_question_audio to authenticated;
grant select on practice.qb_exam_blueprints to authenticated;
grant select on practice.qb_exam_forms to authenticated;
grant select on practice.qb_review_queue to authenticated;
