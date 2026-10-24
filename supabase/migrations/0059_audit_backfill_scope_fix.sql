-- CR-109 r117 fix (0059): scope the guest-actor backfill.
--
-- r117 major: the 0058 predicate 'actor like guest:%' also matches
-- actors already written by 0057 ('guest:' + hash16). Re-running or
-- replaying would hash the opaque value again, producing actors that
-- no longer verify against the watermarks issued under them.
-- Scope to legacy forms only: anything that is NOT the 0057 opaque
-- form ('guest:' + exactly 16 lowercase hex) and not 'guest:unknown'.
-- Raw IPv4 actors contain dots, raw IPv6 actors contain colons or
-- run past 16 chars - neither collides with the hex-16 shape.
--
-- r117 minor: legacy wm verification is documented honestly -
-- recovering a raw guest IP means brute-forcing its sha256. That is
-- feasible for IPv4 (~4.3e9 candidates) but NOT for IPv6. For a
-- leaked row tagged under the 0056 scheme, verify IPv4 candidates by
-- recomputing hmac(id : 'guest:<ip>') across the IPv4 space; IPv6
-- legacy attribution is unrecoverable by design (accepted - the
-- exposure window between 0056 and 0057 was ~40 min and produced
-- zero guest rows).

update practice.qb_fetch_audit
set actor = 'guest:' || left(
      encode(extensions.digest(
        substring(actor from '^guest:(.+)$')::bytea, 'sha256'), 'hex'),
      16)
where actor like 'guest:%'
  and actor <> 'guest:unknown'
  and actor !~ '^guest:[0-9a-f]{16}$';
