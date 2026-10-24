-- Behavioral verification for 0060_audit_actor_canonical_restore
-- (CR-109 r119). Runs the exact WHERE+CASE from the migration over
-- synthetic fixtures without touching qb_fetch_audit. Executed live
-- on the production database 2026-10-24; expected results are in the
-- notes column. Re-run with `execute_sql` or psql to re-verify.
--
-- Expected (verified live):
--   legacy raw ipv4            -> guest:<sha256('203.0.113.7')[:16]>
--   corrupted opaque vs ip_hash-> guest:<ip_hash[:16]>   (canonical restore)
--   unknown preserved          -> guest:unknown          (unchanged)
--   opaque-looking + null ip   -> guest:unknown          (honest degrade)
--   0058-corrupted unknown     -> guest:unknown          (repair)
--   already canonical          -> unchanged
--   second pass over results   -> identical (idempotent)

with fixtures(actor, ip_hash, note) as (values
  ('guest:203.0.113.7', 'aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', 'legacy raw ipv4'),
  ('guest:fec52565aa0cf18f', 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 'corrupted opaque vs mismatched ip_hash'),
  ('guest:unknown', null, 'unknown preserved'),
  ('guest:aaaabbbbccccdddd', null, 'opaque-looking + null ip_hash'),
  ('guest:' || left(encode(extensions.digest('unknown'::bytea,'sha256'),'hex'),16), null, '0058-corrupted unknown'),
  ('guest:' || left('cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'::text,16), 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc', 'already canonical')
)
select note, actor as old_actor,
  case when actor like 'guest:%'
    and ((actor !~ '^guest:[0-9a-f]{16}$' and actor <> 'guest:unknown')
      or (ip_hash is not null and actor <> 'guest:' || left(ip_hash,16))
      or (ip_hash is null and actor ~ '^guest:[0-9a-f]{16}$'))
  then case
    when actor !~ '^guest:[0-9a-f]{16}$' and actor <> 'guest:unknown'
      then 'guest:' || left(encode(extensions.digest(substring(actor from '^guest:(.+)$')::bytea,'sha256'),'hex'),16)
    when ip_hash is not null then 'guest:' || left(ip_hash,16)
    else 'guest:unknown' end
  else actor end as new_actor
from fixtures order by note;
