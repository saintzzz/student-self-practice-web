-- CR-109 r116 fix (0058): pseudonymize historical guest actors.
--
-- Rows written between 0056 and 0057 carry 'guest:<raw-ip>' in
-- qb_fetch_audit.actor - the raw IP the ip_hash column exists to
-- avoid storing. Backfill rewrites them to the 0057 form
-- 'guest:' || first16(sha256(ip)) derived from the embedded IP
-- itself (ip_hash column may be null on header-less contexts).
--
-- Legacy wm verification note: rows tagged under the old scheme
-- were signed with actor='guest:<raw-ip>'. To verify a suspect
-- against a pre-0057 tag, recompute with the raw-IP actor form -
-- the IP is recoverable from this table only via the audit row
-- itself, which this migration pseudonymizes, so legacy checks
-- must recompute candidates from ip_hash: take each distinct
-- ip_hash, the actor candidate is 'guest:<ip>' for the matching
-- source IP - verified by recomputing hmac(id:'guest:'||ip,
-- secret). With zero legacy rows this is documentation only.

update practice.qb_fetch_audit
set actor = 'guest:' || left(
      encode(extensions.digest(
        substring(actor from '^guest:(.+)$')::bytea, 'sha256'), 'hex'),
      16)
where actor like 'guest:%';
