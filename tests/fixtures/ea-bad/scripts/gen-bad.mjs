const pick = a => a[Math.floor(Math.random() * a.length)];
const res = await fetch(url, { method: 'POST', body: '{}' });
console.log('pushed', res.status);
