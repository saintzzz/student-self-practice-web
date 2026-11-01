# External Review - Round 145 (codex)

Reviewer: codex (real external run). Scope: commit HEAD, HEAD=217ed1c.

1. [severity major] scripts/artgen/build-vocab-images.mjs:42 - `--publish` treats approval of a destination path as approval of whichever concept file matches the word ID. No record binds that source to the reviewed asset; `apricot-blossom` and `festival` already have different concept/vocab bytes. Restoring a missing vocab file can silently publish different artwork under its old approval - require an approved source path and content hash, verify both before copying, and reject ambiguous matches.

