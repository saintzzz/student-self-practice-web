-- CR-109 r120 fix (0061): fully idempotent canonical restore.
--
-- r120: the 0060 arms disagree under replay for out-of-band states:
--   raw-IP + null ip_hash -> pass1 hashes the embedded IP (hex16),
--   pass2's null-ip_hash arm degrades it to 'guest:unknown' - the
--   correct value is destroyed on re-run.
--   raw-IP + mismatched ip_hash -> arm1 and arm2 produce different
--   actors on consecutive passes.
--
-- Canonical policy (declared once, applied unconditionally to every
-- 'guest:%' row - idempotent by construction):
--   1. corrupted 'guest:unknown': an opaque-looking actor equal to
--      hash16('unknown') with null ip_hash can only be the 0058
--      corruption of the literal - restore 'guest:unknown'. A real
--      IP hash colliding with that constant is cryptographically
--      negligible.
--   2. ip_hash present -> 'guest:' || left(ip_hash,16): the hash
--      written at fetch time is authoritative, whatever actor form
--      the row currently carries (raw IP, opaque, double-hashed).
--      For a legit 0056 row the embedded IP's hash IS ip_hash, so
--      this preserves verification; for corruption it repairs.
--   3. non-opaque actor + null ip_hash -> hash the embedded value
--      (legacy 'guest:<raw-ip>' written in a header-less context).
--   4. else (already-canonical or unrecoverable hex16 + null ip) ->
--      actor unchanged. hex16 + null ip_hash is left as-is rather
--      than degraded: it may be a legitimately restored hash whose
--      ip_hash was never recorded, and it cannot be distinguished
--      from an unrecoverable opaque actor.

update practice.qb_fetch_audit
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
