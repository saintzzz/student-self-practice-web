-- CR-109 r118 fix (0060): canonical restore for guest actors.
--
-- r118: 0058's broad predicate could double-hash 0057 opaque actors
-- ('guest:' + hash16 -> 'guest:' + hash16(hash16)); the corrupted
-- value still matches the hex-16 exclusion in 0059, so replaying
-- 0056->0057->0058->0059 leaves broken actors that no longer verify
-- against their issued watermarks.
--
-- Every opaque actor is derivable from the row's own ip_hash:
-- 0057 only emits 'guest:' + left(ip_hash,16) when client_ip()
-- exists, and 'guest:unknown' when it does not - so the canonical
-- value can always be rebuilt (or honestly marked unknown). This
-- update is idempotent and self-healing at any corruption depth:
--   arm 1 - non-opaque legacy actors ('guest:<raw-ip>' etc.) get
--           hashed from the embedded value (0059 semantics);
--   arm 2 - hex-16 actors are restored to 'guest:' + left(ip_hash,16)
--           when ip_hash exists (fixes 0058 double-hash corruption);
--   else  - 'guest:unknown' (unrecoverable without ip_hash; cannot
--           occur legitimately since opaque requires an IP).
-- Rows already holding the canonical value are not touched.

update practice.qb_fetch_audit
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
