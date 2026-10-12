async function fetchRetry(url) {
  let last;
  for (let i = 0; i < 4; i++) {
    const r = await fetch(url);
    if (r.ok) return r;
    last = r.status;
    await new Promise((res) => setTimeout(res, 3000));
  }
  throw new Error(`HTTP ${last}`);
}
