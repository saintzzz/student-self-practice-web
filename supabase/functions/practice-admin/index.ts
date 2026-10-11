// CR-08 practice-admin: privileged account ops for the kids' practice
// app. Every action requires a caller JWT that maps to an `admin` row in
// practice.accounts. Service-role access stays inside this function;
// the public client only carries the publishable key.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const EMAIL_DOMAIN = 'students.ioe-practice.example';
const USERNAME_RE = /^[a-z0-9_-]{3,20}$/;
const ROLES = new Set(['admin', 'student']);

const ALLOWED_ORIGINS = new Set([
  'https://ea.vieschool.com',
  'https://ioe-leduyminh.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);
const corsFor = (req: Request) => {
  const origin = req.headers.get('Origin') ?? '';
  const extra = (Deno.env.get('ALLOWED_ORIGIN') ?? '').split(',').map((o) => o.trim()).filter(Boolean);
  const allowed = ALLOWED_ORIGINS.has(origin) || extra.includes(origin);
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'https://ea.vieschool.com',
    Vary: 'Origin',
  };
};
const CORS = {
  'Access-Control-Allow-Origin': 'https://ea.vieschool.com',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, ...(req ? corsFor(req) : {}), 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...CORS, ...corsFor(req) } });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ error: 'unauthorized' }, 401, req);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: 'unauthorized' }, 401, req);

    const svc = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      db: { schema: 'practice' },
    });

    const { data: caller } = await svc
      .from('accounts')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (caller?.role !== 'admin') return json({ error: 'forbidden' }, 403, req);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === 'create-account') {
      const username = String(body?.username ?? '').toLowerCase().trim();
      const displayName = String(body?.displayName ?? '').trim();
      const pin = String(body?.pin ?? '');
      const role = String(body?.role ?? 'student');

      if (!USERNAME_RE.test(username))
        return json({ error: 'Ten dang nhap chi gom 3-20 ky tu a-z, 0-9, _, -' }, 400, req);
      if (!displayName) return json({ error: 'Thieu ten hien thi' }, 400, req);
      if (pin.length < 6) return json({ error: 'Ma PIN can it nhat 6 ky tu' }, 400, req);
      if (!ROLES.has(role)) return json({ error: 'Vai tro khong hop le' }, 400, req);

      const { data: dup } = await svc
        .from('accounts')
        .select('id')
        .eq('username', username)
        .maybeSingle();
      if (dup) return json({ error: 'Ten dang nhap da ton tai' }, 409, req);

      const { data: created, error: createErr } =
        await svc.auth.admin.createUser({
          email: `${username}@${EMAIL_DOMAIN}`,
          password: pin,
          email_confirm: true,
          app_metadata: { practice_role: role },
          user_metadata: { display_name: displayName },
        });
      if (createErr) return json({ error: createErr.message }, 400, req);

      const { error: insertErr } = await svc.from('accounts').insert({
        id: created.user.id,
        username,
        display_name: displayName,
        role,
      });
      if (insertErr) {
        await svc.auth.admin.deleteUser(created.user.id);
        return json({ error: insertErr.message }, 400, req);
      }
      return json({ accountId: created.user.id, username }, 200, req);
    }

    if (action === 'reset-pin') {
      const accountId = String(body?.accountId ?? '');
      const pin = String(body?.pin ?? '');
      if (pin.length < 6) return json({ error: 'Ma PIN can it nhat 6 ky tu' }, 400, req);
      const { data: acct } = await svc
        .from('accounts')
        .select('id')
        .eq('id', accountId)
        .maybeSingle();
      if (!acct) return json({ error: 'Khong tim thay tai khoan' }, 404, req);
      const { error } = await svc.auth.admin.updateUserById(accountId, {
        password: pin,
      });
      if (error) return json({ error: error.message }, 400, req);
      return json({ ok: true }, 200, req);
    }

    if (action === 'delete-account') {
      const accountId = String(body?.accountId ?? '');
      const { data: target } = await svc
        .from('accounts')
        .select('id, role')
        .eq('id', accountId)
        .maybeSingle();
      if (!target) return json({ error: 'Khong tim thay tai khoan' }, 404, req);
      if (target.role === 'admin') {
        const { count } = await svc
          .from('accounts')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'admin');
        if ((count ?? 0) <= 1)
          return json({ error: 'Khong the xoa quan tri vien cuoi cung' }, 400, req);
      }
      const { error } = await svc.auth.admin.deleteUser(accountId);
      if (error) return json({ error: error.message }, 400, req);
      return json({ ok: true }, 200, req);
    }

    return json({ error: 'unknown action' }, 400, req);
  } catch (err) {
    return json({ error: String(err?.message ?? err) }, 500, req);
  }
});
