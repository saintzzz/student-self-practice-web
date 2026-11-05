# External Review - Round 166 (codex)

Reviewer: codex (real external run). Scope: commit fc4d211, HEAD=17e6b33.

1. [major] [AuthScreen.tsx](/Users/kazu.nx/devin_app/student-self-practice-web/src/components/AuthScreen.tsx:144) - The notice says a parent consents by logging in or playing, but the app has no parent-consent step; a child can enter as a guest. Remove the consent claim or add a verifiable parent-consent flow.

2. [major] [AuthScreen.tsx](/Users/kazu.nx/devin_app/student-self-practice-web/src/components/AuthScreen.tsx:146) - The linked terms and privacy paths are documented as rendering landing-page content without actual policies in [the legal audit](/Users/kazu.nx/devin_app/student-self-practice-web/docs/audits/legal-vn-2026-01.md:31). Point to live policy pages before presenting them as governing documents.


## Triage

1. major - FIXED (uncommitted): notice reworded - no asserted consent
   event; states parental guidance + supervision requirement and links
   policies as documents to read. (A verifiable parent-consent flow is a
   separate product decision - tracked in the audit's remaining items.)
2. major - NOT CONFIRMED post-deploy: finding cites the audit doc which
   predates the landing deploy. Verified live 2026-11-05: both
   https://vieschool.com/dieu-khoan and /chinh-sach-bao-mat serve real
   policy documents (worker vieschool-landing-proxy bumped to
   30a8042 + dir-index routing fixed).
