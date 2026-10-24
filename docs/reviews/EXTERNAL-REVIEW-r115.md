# External Review - Round 115 (codex)

Reviewer: codex (real external run). Scope: commit efe4333, HEAD=efe4333.

1. [major] supabase/migrations/0056_leak_watermark_fetch_audit.sql:206 - Guest `actor` embeds the raw client IP, which is persisted alongside question history despite the separate `ip_hash` field. This defeats IP pseudonymization. Fix: use an opaque guest identifier or keyed HMAC; never persist the raw IP in `actor`.

2. [minor] supabase/migrations/0056_leak_watermark_fetch_audit.sql:71 - Watermarks sign only `id:actor`, contrary to the documented `id|actor|ip_hash|rpc` contract. Authenticated fetches across different IPs and RPCs produce identical tags, preventing the claimed attribution. Fix: include those fields in the signed payload and add a behavioral test verifying that changing either changes the tag.

