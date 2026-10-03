# CR-31 - Bao cao tuan qua email cho phu huynh - Tier-1

## Trigger

Product-owner review: parents (the buyers) never hear from the product
unless they open the app. Fifth Tier-1 item under the standing ruling.
CR-29 built the in-app report; CR-31 pushes a weekly digest to email.

## Scope

- `practice.parent_contacts` table: one real parent email per student
  account + `opted_in` flag + `last_sent_at`. RLS: self row only.
- ParentReportScreen gains an "Email cho phu huynh" section (logged-in
  students only): set/update email, toggle nhan/khong nhan.
- `practice.send_weekly_reports()` SECURITY DEFINER function: for each
  opted-in contact, aggregates the last 7 days of `practice.results`
  for that student and POSTs to the Resend API via pg_net.
- pg_cron job `weekly-parent-report`: Sundays 12:00 UTC (= 19:00 VN).
- Resend API key stored in Supabase Vault (`resend_api_key` secret) -
  never in code, migrations, or the client bundle. From address uses
  the verified aal.vn domain.
- `last_sent_at` stamped per contact for observability + idempotent
  re-run safety (skip contacts already sent today).

## Options considered

| Option | Strengths | Weaknesses | Ruling |
|--------|-----------|------------|--------|
| A. Edge Function + Deno.cron | Clean TS, easy template | Edge functions cannot be deployed from this environment (no Supabase access token/project link); Deno.cron is not guaranteed | Rejected |
| B. Vercel cron + serverless fn | Familiar stack | Repo is a pure Vite SPA - no api/ infra; adds a second backend | Rejected |
| C. pg_cron + pg_net + Vault inside Postgres | Zero new infra; secrets stay in Vault; same DB that owns the data | HTML built in SQL (ugly but contained); sends are async (net.http_post) | **Chosen** |

## Security design

- `parent_contacts` RLS: students read/upsert/delete only their own
  row; admin all. No anon access, no grants to anon.
- `send_weekly_reports()`: security definer, `set search_path = ''`,
  revoked from all roles; only callable by the cron step (superuser
  context). Reads the Resend key from `vault.decrypted_secrets`.
- Email content is aggregate stats only - no question text, no other
  students' data.
- Opt-out honored at send time; UI toggle deletes nothing (keeps
  email for easy re-enable) but sets opted_in=false.

## Impact assessment

| Area | Impact |
|------|--------|
| `supabase/migrations/0005_parent_reports.sql` | parent_contacts + RLS, send_weekly_reports(), cron.schedule |
| `src/lib/parentContact.ts` (new) | fetch/save contact via supabase client |
| `src/components/ParentReportScreen.tsx` | email section (logged-in only), opt-in toggle |
| `src/App.tsx` | pass isLoggedIn to ParentReportScreen |
| Tests | contact form states; hidden for guests; save payload shape |

Risk: MEDIUM - new table + scheduled external HTTP. Mitigated:
aggregate-only payload, vault-secret key, opted_in gate, idempotent
last_sent_at.

Estimate: M. No WBS re-run.

## BA artifact / AC

- AC-31.1 GIVEN a logged-in student on the report screen WHEN they
  enter a parent email THEN it persists to practice.parent_contacts.
- AC-31.2 GIVEN a guest WHEN the report screen renders THEN no email
  section appears.
- AC-31.3 GIVEN opted-in contacts with activity in the last 7 days
  WHEN the cron runs THEN a summary email is queued via Resend and
  last_sent_at updates.
- AC-31.4 GIVEN opted_in=false WHEN the cron runs THEN no email is
  sent for that contact.
- AC-31.5 GIVEN a re-run on the same day WHEN last_sent_at is today
  THEN the contact is skipped (idempotent).
