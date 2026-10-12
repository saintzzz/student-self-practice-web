#!/usr/bin/env node
// Deterministic external-review verdict parser.
//
// Why this exists: r25 produced a false "CLEAN" when a poll matched the
// VERDICT example line inside the PROMPT template instead of the actual
// report. Never regex the whole page - extract the verdict from the
// response section only and cross-check it against finding markers.
//
// Usage:
//   node scripts/parse-verdict.mjs <report.txt>
//   cat report.txt | node scripts/parse-verdict.mjs
//
// Exit codes:
//   0 = verified CLEAN (last verdict CLEAN AND zero finding markers after it)
//   1 = NOT-CLEAN (verdict NOT-CLEAN, or findings present)
//   2 = AMBIGUOUS (no verdict, or CLEAN contradicted by findings) -> re-poll
import { readFileSync } from "fs";

const arg = process.argv[2];
const text = arg === "-" || !arg
  ? readFileSync(0, "utf8")
  : readFileSync(arg, "utf8");

// Response markers: Codex cloud renders the assistant reply after a
// "ChatGPT said" divider; a copied report may not have it.
const saidIdx = text.lastIndexOf("ChatGPT said");
const body = saidIdx >= 0 ? text.slice(saidIdx) : text;

const verdicts = [...body.matchAll(/VERDICT:\s*(NOT-CLEAN|CLEAN)/g)].map(
  (m) => m[1],
);
const lastVerdict = verdicts[verdicts.length - 1] ?? null;

// Finding markers in the actual report (severity lines, file:line refs).
const FINDING_RE =
  /(?:^|\n)\s*(?:[-*\d.]*\s*)?(HIGH|MEDIUM|LOW)\s*[-:]/g;
const findings = [...body.matchAll(FINDING_RE)].map((m) => m[1]);
const counts = findings.reduce(
  (a, s) => ((a[s] = (a[s] ?? 0) + 1), a),
  { HIGH: 0, MEDIUM: 0, LOW: 0 },
);

// Prompt-template contamination check: if the text still contains the
// instruction line itself, the verdict must come AFTER it.
const PROMPT_RE = /VERDICT:\s*CLEAN|Ket thuc bang dung 1 dong|prompt/i;
const promptIdx = text.search(/Ket thuc bang|VERDICT:\s*CLEAN hoac/);
const verdictAfterPrompt =
  promptIdx < 0 ? true : text.lastIndexOf("VERDICT:") > promptIdx + 40;

console.log(`verdict=${lastVerdict ?? "none"}`);
console.log(
  `findings=${findings.length} HIGH=${counts.HIGH} MEDIUM=${counts.MEDIUM} LOW=${counts.LOW}`,
);
if (verdicts.length > 1)
  console.log(`warn: ${verdicts.length} verdict lines found - using last`);
if (!verdictAfterPrompt)
  console.log("warn: verdict may come from the prompt template, not the report");

if (!lastVerdict) {
  console.log("RESULT: AMBIGUOUS - no verdict found");
  process.exit(2);
}
if (lastVerdict === "NOT-CLEAN" || findings.length > 0) {
  if (lastVerdict === "CLEAN" && findings.length > 0) {
    console.log(
      "RESULT: AMBIGUOUS - verdict CLEAN but finding markers present; re-verify the report",
    );
    process.exit(2);
  }
  console.log("RESULT: NOT-CLEAN");
  process.exit(1);
}
console.log("RESULT: CLEAN");
process.exit(0);
