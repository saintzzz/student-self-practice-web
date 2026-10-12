async function fetchJson(url) {
  for (let off = 0; ; off += 1000) {
    const page = await fetchRetry(`${url}&offset=${off}&limit=1000`);
    const rows = await page.json();
    if (!rows.length) break;
  }
}
async function fetchRetry(url) {
  let last;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url);
    if (r.ok) return r;
    last = r.status;
    if (last < 500 && last !== 408 && last !== 429) break;
    if (i < 3) await new Promise((res) => setTimeout(res, 3000));
  }
  throw new Error(`HTTP ${last}`);
}
