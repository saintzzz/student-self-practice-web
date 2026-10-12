import { mulberry32 } from './prng.mjs';
const rng = mulberry32(42);
const res = await fetch(url, { method: 'POST', body: '{}' });
if (!res.ok) { console.error('push fail', res.status); process.exit(1); }
