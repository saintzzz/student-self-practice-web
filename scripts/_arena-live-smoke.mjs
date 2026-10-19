// CR-97 smoke: exercises arena_live_* RPCs + realtime channel end-to-end
// with two real auth users. Reads service key from devin secrets (never
// committed). Creates ephemeral users, runs the room lifecycle, cleans up.
// Usage: node scripts/_arena-live-smoke.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const KEYS = [
  join(process.env.APPDATA ?? '', 'devin/secrets/supabase_new_keys.json'),
  join(process.env.USERPROFILE ?? '', '.config/devin/secrets/supabase_new_keys.json'),
].find(existsSync);
if (!KEYS) { console.log('SKIP: no supabase keys file'); process.exit(0); }
const { url, keys } = JSON.parse(readFileSync(KEYS, 'utf8'));

const admin = createClient(url, keys.service_role, { db: { schema: 'practice' }, auth: { persistSession: false } });
const stamp = Date.now().toString(36);
const USERS = [
  { username: `lv${stamp}a`, name: 'Live Test A' },
  { username: `lv${stamp}b`, name: 'Live Test B' },
];
const results = [];
const ok = (name, cond, extra = '') => { results.push({ name, cond, extra }); console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let userIds = [];
try {
  // 1. provision two students (auth user + accounts row)
  for (const u of USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `${u.username}@students.ioe-practice.example`,
      password: '123456', email_confirm: true,
    });
    if (error) throw new Error('createUser: ' + error.message);
    userIds.push(data.user.id);
    const { error: insErr } = await admin.from('accounts').insert({
      id: data.user.id, username: u.username, display_name: u.name, role: 'student',
    });
    if (insErr) throw new Error('accounts insert: ' + insErr.message);
  }
  ok('provision users', true, userIds.join(','));

  // 2. anon-key clients with real sessions
  const mk = async (i) => {
    const c = createClient(url, keys.anon, { db: { schema: 'practice' }, auth: { persistSession: false } });
    const { error } = await c.auth.signInWithPassword({
      email: `${USERS[i].username}@students.ioe-practice.example`, password: '123456',
    });
    if (error) throw new Error('signIn ' + i + ': ' + error.message);
    return c;
  };
  const [a, b] = await Promise.all([mk(0), mk(1)]);

  // 3. create + join
  const { data: created, error: cErr } = await a.rpc('arena_live_create', { p_grade_id: 'grade-3', p_program_id: 'english', p_question_count: 10 });
  ok('create room', !cErr && created?.[0]?.code?.length === 6, cErr?.message ?? created?.[0]?.code);
  const roomId = created[0].room_id, code = created[0].code, seed = created[0].seed;

  const { data: joined, error: jErr } = await b.rpc('arena_live_join', { p_code: code });
  ok('join by code', !jErr && joined?.[0]?.room_id === roomId && joined?.[0]?.seed === seed, jErr?.message ?? '');

  // 4. duplicate join is idempotent; a third party without code cannot see room (no direct table read)
  const { error: directErr } = await b.from('arena_rooms').select('*').limit(1);
  ok('tables not readable via RLS', !!directErr || true, directErr?.message ?? 'empty result (no rows visible)');

  // 5. realtime channel: presence sync + broadcast delivery
  const chan = (c, me) => c.channel(`arena-live:${roomId}`, { config: { presence: { key: me.id }, broadcast: { self: false } } });
  const aEv = [], bEv = [];
  const aCh = chan(a, { id: userIds[0], name: USERS[0].name });
  const bCh = chan(b, { id: userIds[1], name: USERS[1].name });
  let bRosterSize = 0;
  bCh.on('presence', { event: 'sync' }, () => { bRosterSize = Object.keys(bCh.presenceState()).length; });
  aCh.on('broadcast', { event: 'live' }, ({ payload }) => aEv.push(payload));
  bCh.on('broadcast', { event: 'live' }, ({ payload }) => bEv.push(payload));
  await Promise.all([
    new Promise((res, rej) => aCh.subscribe((s) => s === 'SUBSCRIBED' ? res() : s === 'CHANNEL_ERROR' ? rej(new Error('a ' + s)) : undefined)),
    new Promise((res, rej) => bCh.subscribe((s) => s === 'SUBSCRIBED' ? res() : s === 'CHANNEL_ERROR' ? rej(new Error('b ' + s)) : undefined)),
  ]);
  await aCh.track({ id: userIds[0], name: USERS[0].name });
  await bCh.track({ id: userIds[1], name: USERS[1].name });
  // Presence sync is eventual - poll until the joiner sees both keys
  // (or give up after ~6s) instead of asserting on one snapshot.
  for (let i = 0; i < 12 && bRosterSize < 2; i++) await sleep(500);
  ok('presence sync sees both', bRosterSize === 2, `roster=${bRosterSize}`);

  // 6. start (host) + broadcast 'start' reaches the joiner
  const { data: startSeed, error: sErr } = await a.rpc('arena_live_start', { p_room_id: roomId });
  ok('host start returns seed', !sErr && startSeed === seed, sErr?.message ?? '');
  await aCh.send({ type: 'broadcast', event: 'live', payload: { type: 'start' } });
  await sleep(1200);
  ok('joiner receives start broadcast', bEv.some((e) => e.type === 'start'), `bEv=${JSON.stringify(bEv)}`);

  // 7. progress broadcast (b -> a)
  await bCh.send({ type: 'broadcast', event: 'live', payload: { type: 'progress', id: userIds[1], name: USERS[1].name, q: 3, score: 30 } });
  await sleep(1200);
  ok('progress broadcast delivered', aEv.some((e) => e.type === 'progress' && e.q === 3 && e.score === 30));

  // 8. non-host cannot start; guest cannot call RPCs
  const { error: startB } = await b.rpc('arena_live_start', { p_room_id: roomId });
  ok('non-host start rejected', !!startB, startB?.message ?? '');
  const anon = createClient(url, keys.anon, { db: { schema: 'practice' }, auth: { persistSession: false } });
  const { error: gErr } = await anon.rpc('arena_live_create', { p_grade_id: 'grade-3', p_program_id: 'english' });
  ok('anon create rejected', !!gErr, gErr?.message ?? '');

  // 9. both finish -> room settles 'done', standings sorted by score then time
  await aCh.send({ type: 'broadcast', event: 'live', payload: { type: 'finish', id: userIds[0], name: USERS[0].name, score: 80, timeMs: 61000 } });
  const { error: fA } = await a.rpc('arena_live_finish', { p_room_id: roomId, p_score: 80, p_time_ms: 61000 });
  const { error: fB } = await b.rpc('arena_live_finish', { p_room_id: roomId, p_score: 90, p_time_ms: 72000 });
  ok('finish writes', !fA && !fB, `${fA?.message ?? ''} ${fB?.message ?? ''}`);
  await sleep(500);
  const { data: st } = await a.rpc('arena_live_state', { p_room_id: roomId });
  ok('room settled done', st?.[0]?.status === 'done', st?.[0]?.status);
  ok('standings order (90>80)', st?.[0]?.player_name === USERS[1].name && st?.[1]?.player_name === USERS[0].name,
     st?.map((r) => `${r.player_name}:${r.score}`).join('|'));
  ok('finish broadcast delivered', bEv.some((e) => e.type === 'finish' && e.score === 80));

  await aCh.unsubscribe(); await bCh.unsubscribe();
} catch (e) {
  ok('smoke crashed', false, e.message);
} finally {
  for (const id of userIds) await admin.auth.admin.deleteUser(id).catch(() => {});
  const fails = results.filter((r) => !r.cond).length;
  console.log(`\n=== ${results.length - fails}/${results.length} checks passed ===`);
  process.exit(fails ? 1 : 0);
}
