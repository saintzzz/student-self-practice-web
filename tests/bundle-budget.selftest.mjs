// Self-test for scripts/check-bundle-budget.mjs re-anchor (CR-105).
// Verifies the absolute backstop equals the delta gate's effective
// ceiling, the stale-debt wording is gone, and the binding checks
// (delta, lazy caps, lottie AC-2.5) are still the failing path.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = readFileSync(join(ROOT, "scripts/check-bundle-budget.mjs"), "utf8");

const num = (name) => {
  const m = SRC.match(new RegExp(`const ${name}\\s*=\\s*([\\d.]+)`));
  assert.ok(m, `${name} const not found`);
  return Number(m[1]);
};

test("AC-105.2: absolute backstop equals delta-gate ceiling", () => {
  // AC-105.2: JS 129.27+10 -> <=140, CSS 19.6+3 -> <=23.
  assert.ok(num("JS_MAX_KB") >= 129.27 + 10, "JS backstop must cover the delta ceiling");
  assert.ok(num("JS_MAX_KB") <= 141, "JS backstop should not grant open headroom");
  assert.ok(num("CSS_MAX_KB") >= 19.6 + 3, "CSS backstop must cover the delta ceiling");
  assert.ok(num("CSS_MAX_KB") <= 24, "CSS backstop should not grant open headroom");
});

test("AC-105.1: stale-debt wording removed from the report", () => {
  // AC-105.1: a passing build must not still print "inherited debt".
  assert.ok(!SRC.includes("inherited debt"), "legacy inherited-debt wording must be gone");
  assert.ok(!/legacy absolute/i.test(SRC), "legacy-absolute label must be gone");
});

test("AC-105.3: binding checks unchanged", () => {
  // AC-105.3: delta gate, lazy caps, and the AC-2.5 lottie check still
  // drive process.exit - the re-anchor changed labels, not semantics.
  assert.ok(SRC.includes("CR82_BASELINE"), "delta baseline must still exist");
  assert.ok(SRC.includes("CR82_DELTA"), "delta cap must still exist");
  assert.ok(SRC.includes("CR82_LAZY_CAPS"), "lazy chunk caps must still exist");
  assert.ok(SRC.includes("lottie-runtime-free"), "AC-2.5 entry check must still exist");
  // The absolute backstop must remain informational (delta/lazy fail
  // the gate): legacyMax may only feed the report string, never a
  // `failed` assignment.
  assert.ok(
    !/failed\s*=\s*true[^\n]*legacyMax|legacyMax[^\n]*failed\s*=\s*true/.test(SRC),
    "legacyMax must never drive the failed flag (delta is the binding check)",
  );
});
