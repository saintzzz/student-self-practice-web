# Project Memory - English Arena / student-self-practice-web

> Committed memory across phases and sessions. Append-only: new entries go at
> the bottom of the right section, in the same commit as the artifact that
> produced them. Intake and every phase reads this file before working.
> Chat recall is not memory - if it isn't here, it doesn't persist.

## Decisions & rulings
- 2026-02 | CR-69 | Destructive-action confirm = centered dialog (`ConfirmEndDialog`), not inline | Human gate choice | Reversible via CR
- 2026-02 | CR-69 | Deferred: StartBatchScreen restructure, detector cosmetics, signup/forgot-PIN, read-aloud grade-1 | Scope control | Re-entered via kids-UX redesign intent
- 2026-02 | STT | `gemini_model` vault -> `gemini-2.5-flash-lite`; OpenRouter audio hard-requires >=$0.50 balance even on :free | Live incident fix | Vault-level, reversible
- 2026-02 | intake | Fidelity level = token-faithful; no Figma source exists | config default | Standing

## Conventions learned (project-local)
- Vietnamese copy: hyphen `-` only; enforced by `dashGuard.test.ts` + `colorPairingGuard.test.ts` source scanners.
- Playwright browser revision mismatch on this machine: run with `channel: 'chromium'` or installed revision env, not default bundle path.
- JSDOM `HTMLMediaElement.play` throws - app code catches; test stderr noise is expected.

## Lessons from reviews & incidents
- `speech.ts` cached audio must settle+cleanup listeners per replay and only evict if `audioCache.get(text) === audio` (lead review finding).
- Modal `aria-modal` without focus trap/Escape/restore fails review - `ConfirmEndDialog` is the reference implementation.
- Stale confirm state: clear dialog flags on finish AND on new-run `begin()`.
- Multi-key STT fallback exists in `practice-transcribe` edge fn (CR-62); new Gemini keys = new vault secret `gemini_api_key_N`, no migration needed.

## Context that must survive a context reset
- Prod: https://ea.vieschool.com (Vercel `ioe-leduyminh`, team `linhld7s-projects`, Git auto-deploy on `main` push; registry at `deployments/registry.json`).
- Supabase project `cxjpgfhqchjoernfmcra`; audio assets in `ea-audio` bucket serve `Cache-Control: no-cache` (client cache in `speech.ts` mitigates).
- AI/STT keys live in Supabase Vault, read via `get_ai_configs`; never in repo.
- SDLC docs under `docs/sdlc/`; CRs as `CR-NN-*.md`; external review rounds r1-r17 done.
- DESIGN_SYSTEM.md exists at repo root - design law for the navy/gold VieSchool shell; CR-69 noted exam surfaces diverge deliberately (IOE-clone).

## Open threads / deferred work
- Kids-UX redesign + parent-conversion surface (this intent) supersedes the CR-69 deferred list.
- Pronunciation transcription depends on live provider quota; OpenRouter dead for audio; Groq route proposed, not built.
- Detector warnings (gray-on-color, ai-color-palette, side-tab, bounce-easing) deferred to this redesign.
- 2026-02-16 | BA gate | OM-1=B pricing+manual transfer; OM-2=A in-app report only (remote view CR-70); OM-3=C exam hybrid; OM-4=C illustrated pig mascot; OM-5=B both drops same run | Human-approved options | Standing
- 2026-02-16 | Design gate | Concept "Một con đường vàng" approved; constitution amended (mascot/payment/andika dirs + owned-license class, audience G1-5); transfer note = CR-60 'VS <sdt> <goi>'; Andika letter-level G1-2; timer kept | Human-approved | Standing
- 2026-02-16 | Tech gate | Vercel Hobby confirmed (rollback=prev deploy only, main frozen 48h post-drop); plan codes MUATHI/NAMHOC/FOUNDING; rewards keyed by run seed; instruction autoplay once/round; mascot Lottie=JSON; R0 sync-forward-compat ships before Drop-1 | Human-approved | Standing
