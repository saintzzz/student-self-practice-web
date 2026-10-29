/**
 * CR-109 r144/r145: gtmAll pagination contract tests.
 * Lives outside src/ because the ea:service-role-in-client scanner
 * forbids service-role env references in the client bundle - these
 * tests stub the env so no secrets file is needed (CI-safe).
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { gtmAll } from './lib.mjs';
import { capDayFilter, reaperFilter } from './send.mjs';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const stubEnv = () => {
  vi.stubEnv('GTM_SUPABASE_URL', 'https://test.supabase.co');
  vi.stubEnv('GTM_SERVICE_ROLE_KEY', 'test-key');
};
const fullPage = () => Array.from({ length: 1000 }, (_, i) => ({ id: String(i + 1), v: i }));
const pageOf = (rows) => new Response(JSON.stringify(rows), { status: 200 });

describe('gtmAll only paginates on unique id asc (r143-4)', () => {
  it('paginates past 1000 on order=id', async () => {
    stubEnv();
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      calls.push(url);
      return pageOf(calls.length === 1 ? fullPage() : [{ id: 'z', v: 1 }]);
    }));
    const rows = await gtmAll('leads', '*', '', 'id');
    expect(calls.length).toBe(2);
    expect(calls[1]).toContain('id=gt.1000');
    expect(rows.length).toBe(1001);
  });

  it('non-unique/non-id order returns ONE bounded page - no wrong concatenation', async () => {
    stubEnv();
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      calls.push(url);
      return pageOf(fullPage());
    }));
    const rows = await gtmAll('leads', '*', '', 'created_at');
    expect(calls.length).toBe(1);
    expect(rows.length).toBe(1000);
  });

  it('desc order returns ONE bounded page; order suffixes pass through', async () => {
    stubEnv();
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      calls.push(url);
      return pageOf(fullPage());
    }));
    await gtmAll('leads', '*', '', 'fit.desc');
    await gtmAll('leads', '*', '', 'fit.desc.nullslast');
    expect(calls.length).toBe(2);
    expect(calls[0]).toContain('order=fit.desc');
    expect(calls[1]).toContain('order=fit.desc.nullslast');
  });
});

describe('send.mjs PostgREST filters (r146/r147 regression)', () => {
  it('cap-day filter encodes the +07:00 offset - never a literal +', () => {
    const f = capDayFilter('2026-10-29');
    expect(f).toContain('%2B07%3A00');
    expect(f).not.toContain('+07:00');
    expect(f).toContain('kind=eq.sent');
    expect(f).toContain('created_at=gte.');
  });
  it('reaper filter requires sending + null pid + stale claim', () => {
    const f = reaperFilter('2026-10-29T06:00:00.000Z');
    expect(f).toContain('status=eq.sending');
    expect(f).toContain('provider_message_id=is.null');
    expect(f).toContain('updated_at=lt.');
    expect(f).not.toContain('+');
  });
});
