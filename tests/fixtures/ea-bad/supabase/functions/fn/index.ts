const hdrs = { 'Access-Control-Allow-Origin': '*' };
const seen = new Map(); // rate limit in memory
const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim();
