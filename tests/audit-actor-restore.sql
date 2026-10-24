-- Behavioral verification for 0061_audit_actor_idempotent_restore
-- (CR-109 r120). Executes the EXACT canonical policy from the
-- migration over synthetic fixtures and RAISES on any mismatch -
-- no silent green output. Covers: legacy raw IP (with and without
-- stored ip_hash), corrupted opaque, preserved unknown,
-- unrecoverable opaque, 0058-corrupted unknown, already-canonical,
-- and replay idempotency (transform applied twice must equal once).
--
-- Run with: execute_sql (MCP) or psql -f. Verified live on prod
-- 2026-10-24.

create or replace function pg_temp.restore_actor(p_actor text, p_ip_hash text)
returns text language sql as $$
  select case
    when p_actor = 'guest:' || left(
           encode(extensions.digest('unknown'::bytea, 'sha256'), 'hex'), 16)
         and p_ip_hash is null then 'guest:unknown'
    when p_ip_hash is not null then 'guest:' || left(p_ip_hash, 16)
    when p_actor !~ '^guest:[0-9a-f]{16}$' and p_actor <> 'guest:unknown'
      then 'guest:' || left(
        encode(extensions.digest(
          substring(p_actor from '^guest:(.+)$')::bytea, 'sha256'), 'hex'),
        16)
    else p_actor
  end
$$;

do $$
declare
  f record;
  v1 text;
  v2 text;
begin
  for f in
    select * from (values
      -- legacy raw IPv4 + stored hash of same IP -> ip_hash wins (arm 2)
      ('guest:203.0.113.7',
       encode(extensions.digest('203.0.113.7'::bytea,'sha256'),'hex'),
       'guest:' || left(encode(extensions.digest('203.0.113.7'::bytea,'sha256'),'hex'),16)),
      -- legacy raw IP + null ip_hash -> hash embedded value (arm 3)
      ('guest:198.51.100.9', null,
       'guest:' || left(encode(extensions.digest('198.51.100.9'::bytea,'sha256'),'hex'),16)),
      -- legacy raw IP + MISMATCHED ip_hash -> ip_hash is authoritative
      ('guest:203.0.113.7',
       'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
       'guest:dddddddddddddddd'),
      -- corrupted opaque: double-hashed + mismatched ip_hash -> restore
      ('guest:fec52565aa0cf18f',
       'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
       'guest:bbbbbbbbbbbbbbbb'),
      -- preserved unknown
      ('guest:unknown', null, 'guest:unknown'),
      -- unrecoverable opaque + null ip_hash -> left as-is (idempotent)
      ('guest:aaaabbbbccccdddd', null, 'guest:aaaabbbbccccdddd'),
      -- 0058-corrupted unknown: hash16('unknown') + null ip -> restore
      ('guest:' || left(encode(extensions.digest('unknown'::bytea,'sha256'),'hex'),16),
       null, 'guest:unknown'),
      -- already canonical -> unchanged
      ('guest:cccccccccccccccc',
       'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
       'guest:cccccccccccccccc')
    ) t(actor, ip_hash, expected)
  loop
    v1 := pg_temp.restore_actor(f.actor, f.ip_hash);
    v2 := pg_temp.restore_actor(v1, f.ip_hash);
    if v1 is distinct from f.expected then
      raise exception 'restore mismatch: % -> % (expected %)', f.actor, v1, f.expected;
    end if;
    if v2 is distinct from v1 then
      raise exception 'not idempotent: % -> % -> %', f.actor, v1, v2;
    end if;
  end loop;
  raise notice 'audit-actor-restore: all fixtures canonical + idempotent';
end $$;
