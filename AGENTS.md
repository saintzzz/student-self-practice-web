# English Arena / Student Self-Practice Web

Part of the VieSchool/TVC360 education ecosystem. Vite + React frontend for
student self-practice (English exercises, phonics, listening, mock tests).

## Mandatory SDLC (no bypass)

- **All feature work runs the multi-agent-framework pipeline** (PM → BA → Designer → Tech Lead → Developer → Tester → Deployer → External Review Loop). Direct implementation is forbidden; the only exceptions are trivial fixes changing no requirement (typo, lint, one-line bug) - those still need lint/build.
- **External Review Loop (mandatory):** after deploy, an independent review runs on source/structure/security/performance/UIUX; findings are triaged (fixed / not-confirmed+evidence / deferred+design) and the loop repeats until a clean round (max 3, then human adjudicates). Mechanism, in priority order: (1) `npm run review:external` - Codex CLI (`codex review --commit/--base`), requires `npm i -g @openai/codex` + one-time `codex login`, writes `docs/reviews/EXTERNAL-REVIEW-rNN.md`; (2) pinned cross-model reviewer subagent (`reviewer-gpt`/`reviewer-claude`) - the documented fallback used for rounds r1-r18. Codex Cloud web is NOT wired (it only reviews PRs; this repo pushes to main) - do not claim it ran.
- **Harness:** `.devin/skills/` vendored from PU_SDLC (ponytail, impeccable, caveman) + playwright-cli + chrome-devtools MCP - refresh via `PU_SDLC/scripts/bootstrap-harness.sh`.
- **Requirement changes are CRs.** Write `docs/project/CR-NNN-*.md` (scope + impact + separate estimate), get approval, re-enter at earliest affected phase.

## Conventions

- Vietnamese copy: hyphen `-` only, never em-dash/en-dash.
- Before claiming done: lint + build green, Playwright-verify the real flow.
