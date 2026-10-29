# CR-110: GTM autonomous outreach loop (weekly cadence + inbox reply)

Scope: extend the CR-109 GTM pipeline (discover/enrich/draft/send) into a
closed loop that runs itself weekly and handles replies end-to-end.

## Requirements (user, 2026-10-30)

1. **Weekly cadence**: outreach sweep runs weekly. If a lead has no reply
   after 1 week, draft a DIFFERENT follow-up email highlighting VieSchool
   strengths WITH images. Feature screenshots rotate week to week
   (productivity/grading/report/pronunciation/bank size...), not the same
   image every time.
2. **Reply loop**: poll the hello@vieschool.com inbox (Gmail API via
   Cloudflare-forwarded mailbox). When a lead replies, classify intent:
   - wants consult / left a phone number -> notify the PO to call
   - wants a trial -> provision a demo teacher account + usage guide
     and send credentials
3. **Notify**: any reply containing a phone number or consult intent is
   escalated to the owner for a manual call.
4. **Demo account**: teacher-scoped role only (NOT admin; no question-bank
   write, no user management). Duration ~24h then auto-expire; the
   expiration is stated in the credentials email so the teacher knows.

## Design notes

- Gmail access: OAuth once (gmail.readonly + gmail.send), refresh token in
  ~/.config/devin/secrets. Poll every ~15min via launchd/cron on the
  ops machine. Match sender -> gtm.leads.contact_email.
- Reply drafts go through the same pending_review gate as outbound drafts
  initially (draft-only mode), promote to auto-send once quality holds.
- Demo teacher: dedicated `demo` role flag or time-boxed expiry column;
  provision + expire via service-role script (no admin UI needed yet).
- Images for follow-ups: pull from public/images (existing artgen set) or
  a screenshots/ dir; rotate by week index deterministically.
- Existing gates kept: daily send cap, suppression re-check, CAS claim,
  pending_review for drafts.

## Acceptance

- AC-110.1 weekly run stages new leads and follow-ups for unreplied >=7d
- AC-110.2 inbox poll detects reply, classifies consult-vs-trial, logs
- AC-110.3 consult intent -> owner notification (email/log) with phone
- AC-110.4 trial intent -> demo teacher account (24h expiry) + guide sent
- AC-110.5 demo account cannot write question bank / manage users
- AC-110.6 follow-up emails attach rotating feature images by week
