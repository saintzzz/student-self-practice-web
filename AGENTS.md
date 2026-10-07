# English Arena / Student Self-Practice Web

Part of the VieSchool/TVC360 education ecosystem. Vite + React frontend for
student self-practice (English exercises, phonics, listening, mock tests).

## Mandatory SDLC (no bypass)

- **All feature work runs the multi-agent-framework pipeline** (PM → BA → Designer → Tech Lead → Developer → Tester → Deployer → External Review Loop). Direct implementation is forbidden; the only exceptions are trivial fixes changing no requirement (typo, lint, one-line bug) - those still need lint/build.
- **External Review Loop (mandatory):** after deploy, an independent whole-repo review (Codex Cloud primary) runs on source/structure/security/performance/UIUX; findings are triaged (fixed / not-confirmed+evidence / deferred+design) and the loop repeats until a clean round (max 3, then human adjudicates). Runbook: `PU_SDLC/EXTERNAL_REVIEW_LOOP.md`.
- **Harness:** `.devin/skills/` vendored from PU_SDLC (ponytail, impeccable, caveman) + playwright-cli + chrome-devtools MCP - refresh via `PU_SDLC/scripts/bootstrap-harness.sh`.
- **Requirement changes are CRs.** Write `docs/project/CR-NNN-*.md` (scope + impact + separate estimate), get approval, re-enter at earliest affected phase.

## Conventions

- Vietnamese copy: hyphen `-` only, never em-dash/en-dash.
- Before claiming done: lint + build green, Playwright-verify the real flow.
