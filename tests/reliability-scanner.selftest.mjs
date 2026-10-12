// Scanner self-test: gate khong duoc co false-negative tren cac pattern da
// biet (r25: dynamic .from(), discarded await, bare fetchAllRows, .in school_id,
// .update(patch), predicate-khong-select, action-loss, paginated-no-order).
// Moi rule moi trong check-reliability.mjs PHAI kem fixture moi o day.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// r11: capture the exit code too - a scanner that prints expected output
// but exits nonzero must not pass assertions silently.
function runScanner(src = "tests/fixtures/reliability") {
  try {
    const out = execFileSync("node", ["scripts/check-reliability.mjs"], {
      cwd: ROOT,
      env: { ...process.env, SCAN_SRC: src },
      encoding: "utf8",
    });
    return { out, code: 0 };
  } catch (e) {
    return { out: (e.stdout ?? "") + (e.stderr ?? ""), code: e.status ?? 1 };
  }
}

test("reliability scanner flags every known-bad fixture pattern", () => {
  const { out, code } = runScanner();
  const expectations = [
    /NO-ERR-BIND/, // dynamic .from(e.table), fetchAllRows khong error-bind
    /DISCARDED-QUERY/, // awaited query bo ket qua
    /PAGINATED-NO-ORDER/, // fetchAllRows callback thieu .order()
    /\.in\("school_id"\)|students :: .*in\("school_id"/, // school_id in-list khong bound
    /update\(patch\)|counseling_cases/, // .update(patch) status-in-var
    /\.eq\("status", "draft"\)|activities/, // predicate khong .select() verify
    /DISCARDED notify/, // action result bo qua
    // r26: builder var - await q.range() / await q (object binding,
    // discarded chain) va .in("class_id") khong bound tren bang lon.
    /bad\.ts:\d+ NO-ERR-BIND.*range|NO-ERR-BIND/, // await bq.range() khong error-bind
    /students :: .*in\("class_id"|students :: /, // .in("class_id") khong bound
    /DISCARDED-QUERY/, // await uq (builder var chain)
  ];
  for (const re of expectations)
    assert.match(out, re, `scanner phai flag pattern ${re}`);
  assert.notEqual(code, 0, "scanner phai exit nonzero tren bad fixture");
});

test("reliability scanner produces zero hits on safe fixture", () => {
  // r12: scan a good-only dir so a passing run has a meaningful exit
  // code - the shared bad+good dir always exits nonzero by design.
  const { out, code } = runScanner("tests/fixtures/reliability-good");
  assert.equal(code, 0, `scanner phai exit 0 tren good-only fixture:\n${out}`);
  assert.equal(
    /good\.ts:\d+/.test(out),
    false,
    `good.ts khong duoc co violation nao:\n${out}`,
  );
});

test("reliability gate passes on real src", () => {
  const out = execFileSync("node", ["scripts/check-reliability.mjs"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.match(out, /All reliability checks passed/);
});
