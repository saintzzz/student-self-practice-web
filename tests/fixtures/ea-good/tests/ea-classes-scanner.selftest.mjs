import { execFileSync } from "node:child_process";
function scan() {
  try {
    return { out: execFileSync("node", ["scripts/check-ea-classes.mjs"]), code: 0 };
  } catch (e) {
    return { out: (e.stdout ?? "") + (e.stderr ?? ""), code: e.status ?? 1 };
  }
}
test("good fixture passes", () => {
  const { out, code } = scan();
  assert.equal(code, 0);
  assert.match(out, /All EA defect-class checks passed/);
});
