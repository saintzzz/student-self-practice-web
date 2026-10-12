# External Review - Round 6 Triage

Codex Cloud task `01a12e74`, post-r5 commit `62ba398`.
Verdict: **NOT-CLEAN** - 3 Medium (no Critical/High). All source-confirmed.
The class-convergence prompt held: all 3 findings are genuinely NEW
classes, none re-described an already-gated class. Each got a permanent
gate in `scripts/check-ea-classes.mjs` (now 30 classes, all fixture-
covered and self-tested).

## M1. unverified-recipient - child progress mailed to unconfirmed address

`src/lib/parentContact.ts` upserts any syntactically valid email into
`parent_contacts`; RLS only binds `account_id = auth.uid()`; the weekly
`send_weekly_reports` cron mailed that address a child's name + activity
with no ownership proof or consent. A logged-in student could point the
report at any third party.

**Fix (0036):** `verified` / `verify_token` / `verify_token_sent_at`
columns; `request_parent_verify()` mails a signed-token confirm link
(10-min resend throttle, Resend via vault); `confirm_parent_email(token)`
is anon-callable (the link IS the capability, 7-day expiry, one-shot);
a `before update` trigger resets verification when the email changes for
ANY writer; column-level revokes stop clients self-verifying. Weekly send
now filters `and pc.verified`. Client: save -> verify request; report
screen shows verified/pending + "Gửi lại email"; `?verify_email=` link
lands on a confirm screen in `App.tsx`.
**Gate #28** - send function must filter `pc.verified`; corpus must
carry the confirm RPC, the verified flag, and the column-write revoke.
**Live-verify:** anon `confirm_parent_email` -> `{ok:false}`; anon
`request_parent_verify` -> 42501 denied; `pg_proc.prosrc` contains
`pc.verified`.

## M2. email-html-injection - display_name raw into outbound mail HTML

`send_weekly_reports` concatenated `v_row.display_name` straight into the
email subject + HTML body; `practice-admin` accepts arbitrary display
names, so a name like `<img onerror>` became active markup in parent
mailboxes.

**Fix (0036):** `practice.email_esc()` (& < > ") applied to every
interpolated text value - display_name in subject + body, and the
else-branch program label. Verify email body escapes display_name too.
**Gate #29** - latest `send_weekly_reports`/`request_parent_verify`
defs: any `|| X.display_name|full_name|student_name` concat is a hit.

## M3. xff-spoofable - rate-limit bucket keyed on caller-controlled header

`practice-transcribe` read `cf-connecting-ip ?? first x-forwarded-for
entry` for its DB-backed rate bucket. Both are caller-suppliable: a
client prepends a fake hop or sets cf-connecting-ip and rotates buckets
to burn AI transcription quota past the limiter.

**Fix (edge fn v12):** the bucket key is the LAST `x-forwarded-for`
entry - the value the ingress proxy appends and the caller cannot
control. cf-connecting-ip is only a fallback when no XFF exists.
**Gate #30** - `split(',')[0]` / `.shift()` on XFF, or preferring
cf-connecting-ip with no last-hop fallback, is a hit.

## Deferred (unchanged)

- `result-forgery` - CR-68 server-side score attestation.
