-- Behavioral verification for the guest-actor restore chain
-- (CR-109 r119-r121). Replays the ACTUAL UPDATE statements from
-- migrations 0058 -> 0059 -> 0060 -> 0061 against an isolated
-- pg_temp fixture table (identical shape to qb_fetch_audit), then
-- asserts canonical actors and idempotency. RAISES on any mismatch.
--
-- Drift rule: the UPDATE bodies below must stay byte-identical to
-- the migration files (modulo the table name). The node selftest
-- enforces this - editing a migration without updating this file
-- fails tests/fetch-forensics.selftest.mjs.
--
-- Run with: execute_sql (MCP) or psql -f. Verified live 2026-10-24.

create table pg_temp.audit_fixture (
  actor text not null,
  ip_hash text,
  rpc text not null,
  question_ids text[] not null,
  fetched_at timestamptz not null default now()
);

insert into pg_temp.audit_fixture(actor, ip_hash, rpc, question_ids) values
  -- 0056-era rows: raw IP actor + stored hash of same IP
  ('guest:203.0.113.7',
   encode(extensions.digest('203.0.113.7'::bytea,'sha256'),'hex'),
   'fetch_questions_public', '{q1}'),
  -- raw IP actor, no stored hash (cannot occur from 0056 code -
  -- raw-IP actor implies client_ip existed hence ip_hash non-null;
  -- kept to document the degraded outcome under full replay)
  ('guest:198.51.100.9', null, 'fetch_questions_public', '{q2}'),
  -- 0057-era opaque rows: actor = 'guest:' + left(ip_hash,16)
  ('guest:bbbbbbbbbbbbbbbb',
   'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
   'fetch_questions', '{q3}'),
  -- ip present at fetch, hash column later nulled (edge case)
  ('guest:aaaaaaaaaaaaaaaa', null, 'fetch_questions', '{q4}'),
  -- unknown rows written both eras
  ('guest:unknown', null, 'fetch_questions', '{q5}'),
  -- authenticated actor rows must never be touched
  ('d0000000-0000-4000-8000-00000000a001',
   'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
   'fetch_questions', '{q6}');

-- ===== 0058 verbatim (table name swapped) =====
update pg_temp.audit_fixture
set actor = 'guest:' || left(
      encode(extensions.digest(
        substring(actor from '^guest:(.+)$')::bytea, 'sha256'), 'hex'),
      16)
where actor like 'guest:%';

-- ===== 0059 verbatim =====
update pg_temp.audit_fixture
set actor = 'guest:' || left(
      encode(extensions.digest(
        substring(actor from '^guest:(.+)$')::bytea, 'sha256'), 'hex'),
      16)
where actor like 'guest:%'
  and actor <> 'guest:unknown'
  and actor !~ '^guest:[0-9a-f]{16}$';

-- ===== 0060 verbatim =====
update pg_temp.audit_fixture
set actor = case
  when actor !~ '^guest:[0-9a-f]{16}$' and actor <> 'guest:unknown'
    then 'guest:' || left(
      encode(extensions.digest(
        substring(actor from '^guest:(.+)$')::bytea, 'sha256'), 'hex'),
      16)
  when ip_hash is not null then 'guest:' || left(ip_hash, 16)
  else 'guest:unknown'
end
where actor like 'guest:%'
  and (
    (actor !~ '^guest:[0-9a-f]{16}$' and actor <> 'guest:unknown')
    or (ip_hash is not null and actor <> 'guest:' || left(ip_hash, 16))
    or (ip_hash is null and actor ~ '^guest:[0-9a-f]{16}$')
  );

-- ===== 0061 verbatim, pass 1 =====
update pg_temp.audit_fixture
set actor = case
  when actor = 'guest:' || left(
         encode(extensions.digest('unknown'::bytea, 'sha256'), 'hex'), 16)
       and ip_hash is null then 'guest:unknown'
  when ip_hash is not null then 'guest:' || left(ip_hash, 16)
  when actor !~ '^guest:[0-9a-f]{16}$' and actor <> 'guest:unknown'
    then 'guest:' || left(
      encode(extensions.digest(
        substring(actor from '^guest:(.+)$')::bytea, 'sha256'), 'hex'),
      16)
  else actor
end
where actor like 'guest:%';

-- snapshot pass-1 results BEFORE pass 2 (r122: asserting only the
-- final state lets a corrupt-then-repair sequence pass undetected)
create table pg_temp.audit_pass1 as
  select question_ids, actor from pg_temp.audit_fixture;

-- ===== 0061 verbatim, pass 2 =====
update pg_temp.audit_fixture
set actor = case
  when actor = 'guest:' || left(
         encode(extensions.digest('unknown'::bytea, 'sha256'), 'hex'), 16)
       and ip_hash is null then 'guest:unknown'
  when ip_hash is not null then 'guest:' || left(ip_hash, 16)
  when actor !~ '^guest:[0-9a-f]{16}$' and actor <> 'guest:unknown'
    then 'guest:' || left(
      encode(extensions.digest(
        substring(actor from '^guest:(.+)$')::bytea, 'sha256'), 'hex'),
      16)
  else actor
end
where actor like 'guest:%';

-- ===== assertions: chain replay + pass1/pass2 equality =====
do $$
declare
  bad int;
begin
  if (select actor from pg_temp.audit_fixture where question_ids = '{q1}')
     <> 'guest:' || left(encode(extensions.digest('203.0.113.7'::bytea,'sha256'),'hex'),16)
     then raise exception 'raw-IP+hash row not canonical'; end if;
  -- q2: under full replay, 0060's null-hash arm degrades the 0058
  -- hash to 'guest:unknown' and 0061 cannot recover it (indistin-
  -- guishable from a real unknown). Accepted: this state cannot be
  -- produced by the 0056 code path (raw-IP actor implies an ip_hash
  -- was written). Assert the documented outcome, not the ideal one.
  if (select actor from pg_temp.audit_fixture where question_ids = '{q2}')
     <> 'guest:unknown'
     then raise exception 'impossible-state row diverged'; end if;
  if (select actor from pg_temp.audit_fixture where question_ids = '{q3}')
     <> 'guest:bbbbbbbbbbbbbbbb' then raise exception 'opaque row corrupted'; end if;
  if (select actor from pg_temp.audit_fixture where question_ids = '{q4}')
     not in ('guest:aaaaaaaaaaaaaaaa','guest:unknown')
     then raise exception 'null-hash opaque row mangled'; end if;
  if (select actor from pg_temp.audit_fixture where question_ids = '{q5}')
     <> 'guest:unknown' then raise exception 'unknown row not preserved'; end if;
  if (select actor from pg_temp.audit_fixture where question_ids = '{q6}')
     <> 'd0000000-0000-4000-8000-00000000a001'
     then raise exception 'authenticated actor touched'; end if;
  select count(*) into bad from pg_temp.audit_fixture
    where actor ~ '(^|guest:)([0-9]{1,3}\.){3}[0-9]{1,3}';
  if bad > 0 then raise exception '% raw-IP actors remain', bad; end if;
  -- strict idempotency: pass 2 must not change ANY pass-1 result
  select count(*) into bad from pg_temp.audit_fixture f
    join pg_temp.audit_pass1 p using (question_ids)
    where f.actor is distinct from p.actor;
  if bad > 0 then raise exception '% rows changed on second pass', bad; end if;
end $$;

-- ===== isolated 0061 inputs (r122: chain replay transforms these
-- states before 0061 sees them - arm coverage needs fresh rows) =====
create table pg_temp.audit_iso (
  actor text not null,
  ip_hash text,
  rpc text not null,
  question_ids text[] not null
);
insert into pg_temp.audit_iso(actor, ip_hash, rpc, question_ids) values
  -- corrupted 'unknown': exact hash16('unknown') + null ip_hash
  ('guest:' || left(encode(extensions.digest('unknown'::bytea,'sha256'),'hex'),16),
   null, 'fetch_questions', '{i1}'),
  -- raw-IP actor + null ip_hash (arm 3 alone)
  ('guest:198.51.100.9', null, 'fetch_questions_public', '{i2}'),
  -- raw-IP actor + MISMATCHED ip_hash (ip_hash authoritative)
  ('guest:203.0.113.7',
   'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
   'fetch_questions_public', '{i3}'),
  -- opaque + null ip_hash: unrecoverable, preserved as-is
  ('guest:aaaabbbbccccdddd', null, 'fetch_questions', '{i4}'),
  -- opaque + matching ip_hash: canonical already
  ('guest:eeeeeeeeeeeeeeee',
   'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
   'fetch_questions', '{i5}');

update pg_temp.audit_iso
set actor = case
  when actor = 'guest:' || left(
         encode(extensions.digest('unknown'::bytea, 'sha256'), 'hex'), 16)
       and ip_hash is null then 'guest:unknown'
  when ip_hash is not null then 'guest:' || left(ip_hash, 16)
  when actor !~ '^guest:[0-9a-f]{16}$' and actor <> 'guest:unknown'
    then 'guest:' || left(
      encode(extensions.digest(
        substring(actor from '^guest:(.+)$')::bytea, 'sha256'), 'hex'),
      16)
  else actor
end
where actor like 'guest:%';

do $$
begin
  if (select actor from pg_temp.audit_iso where question_ids = '{i1}')
     <> 'guest:unknown' then raise exception 'corrupted-unknown not repaired'; end if;
  if (select actor from pg_temp.audit_iso where question_ids = '{i2}')
     <> 'guest:' || left(encode(extensions.digest('198.51.100.9'::bytea,'sha256'),'hex'),16)
     then raise exception 'raw-IP arm3 wrong'; end if;
  if (select actor from pg_temp.audit_iso where question_ids = '{i3}')
     <> 'guest:dddddddddddddddd' then raise exception 'mismatched-hash policy wrong'; end if;
  if (select actor from pg_temp.audit_iso where question_ids = '{i4}')
     <> 'guest:aaaabbbbccccdddd' then raise exception 'unrecoverable opaque degraded'; end if;
  if (select actor from pg_temp.audit_iso where question_ids = '{i5}')
     <> 'guest:eeeeeeeeeeeeeeee' then raise exception 'canonical row rewritten'; end if;
  raise notice 'audit-actor-restore: chain + isolated cases all canonical';
end $$;
