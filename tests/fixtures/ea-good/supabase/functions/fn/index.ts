const origin = req.headers.get('origin') ?? '';
const allowed = ALLOWED.includes(origin);
const hdrs = { 'Access-Control-Allow-Origin': allowed ? origin : 'https://ea.vieschool.com' };
await supa.rpc('check_rate_limit', {});
