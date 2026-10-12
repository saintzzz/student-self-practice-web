import { execFileSync } from "node:child_process";
function scan() {
  try {
    return execFileSync("node", ["scripts/check-ea-classes.mjs"]);
  } catch (e) {
    return (e.stdout ?? "") + (e.stderr ?? "");
  }
}
test("good fixture passes", () => {
  assert.match(scan(), /All EA defect-class checks passed/);
});
