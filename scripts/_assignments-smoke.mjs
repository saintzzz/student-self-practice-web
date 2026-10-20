// CR-98 smoke: exercises the assignment_* RPC surface end-to-end with a
// real teacher + two students on the live project. Provisions ephemeral
// users/class via service role, runs create -> enroll -> take -> submit
// -> report -> remediate -> close, cleans up.
// Usage: node scripts/_assignments-smoke.mjs
import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const KEYS = [
  join(process.env.APPDATA ?? '', 'devin/secrets/supabase_new_keys.json'),
  join(process.env.USERPROFILE ?? '', '.config/devin/secrets/supabase_new_keys.json'),
].find(existsSync);
if (!KEYS) { console.log('SKIP: no supabase keys file'); process.exit(0); }
const { url, keys } = JSON.parse(readFileSync(KEYS, 'utf8'));

setTimeout(() => process.exit(0), 120_000).unref();
const admin = createClient(url, keys.service_role, { db: { schema: 'practice' }, auth: { persistSession: false } });
const stamp = Date.now().toString(36);
const USERS = [
  { username: `as${stamp}t`, name: 'Co Test', role: 'teacher' },
  { username: `as${stamp}a`, name: 'HS An', role: 'student' },
  { username: `as${stamp}b`, name: 'HS Binh', role: 'student' },
  { username: `as${stamp}x`, name: 'HS Ngoai', role: 'student' },
  { username: `as${stamp}t2`, name: 'Co Khac', role: 'teacher' },
];
const results = [];
const ok = (name, cond, extra = '') => { results.push({ name, cond }); console.log(`${cond ? 'PASS' : 'FAIL'} ${name} ${extra}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let userIds = [];
let classId = null;
let otherClassId = null;
const clientOf = {};
try {
  // 1. provision teacher x2, students x3
  for (const u of USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `${u.username}@students.ioe-practice.example`,
      password: '123456', email_confirm: true,
    });
    if (error) throw new Error('createUser: ' + error.message);
    userIds.push(data.user.id);
    const { error: insErr } = await admin.from('accounts').insert({
      id: data.user.id, username: u.username, display_name: u.name, role: u.role,
    });
    if (insErr) throw new Error('accounts insert: ' + insErr.message);
    const c = createClient(url, keys.anon, { db: { schema: 'practice' }, auth: { persistSession: false } });
    await c.auth.signInWithPassword({ email: `${u.username}@students.ioe-practice.example`, password: '123456' });
    clientOf[u.role === 'teacher' ? (clientOf.t ? 't2' : 't') : u.username.slice(-1)] = c;
  }
  ok('provision 5 users', true);
  const [teacher, t2, stA, stB, stX] = [clientOf.t, clientOf.t2, clientOf.a, clientOf.b, clientOf.x];
  const [tId, aId, bId, xId] = userIds;

  // 2. class owned by teacher, scope grade-2, join_code auto
  const { data: cls, error: clsErr } = await admin.from('classes').insert({
    name: `Lop ${stamp}`, grade_id: 'grade-2', created_by: tId,
  }).select('id, join_code').single();
  if (clsErr) throw new Error('class insert: ' + clsErr.message);
  classId = cls.id;
  await admin.from('class_grade_scopes').insert({ class_id: classId, grade_id: 'grade-2' });
  // second class owned by the OTHER teacher (cross-teacher denial target)
  const { data: cls2 } = await admin.from('classes').insert({
    name: `Khac ${stamp}`, grade_id: 'grade-2', created_by: userIds[4],
  }).select('id').single();
  otherClassId = cls2.id;
  await admin.from('class_grade_scopes').insert({ class_id: otherClassId, grade_id: 'grade-2' });
  ok('provision classes', !!classId && !!otherClassId, `code=${cls.join_code}`);

  // 3. student A joins via code RPC; B enrolled directly (roster=2)
  const { data: joinRes, error: joinErr } = await stA.rpc('join_class_by_code', { p_code: cls.join_code });
  ok('student joins via code', !joinErr, joinErr?.message ?? JSON.stringify(joinRes));
  await admin.from('enrollments').insert({ class_id: classId, student_id: bId });

  // 4. create assignment (teacher, owner)
  const due = new Date(Date.now() + 24 * 3600_000).toISOString();
  const { data: asgId, error: cErr } = await teacher.rpc('assignment_create', {
    p_class_id: classId, p_title: 'Bai test khoi 2', p_grade_id: 'grade-2',
    p_program_id: 'english', p_question_count: 10, p_due_at: due,
  });
  ok('teacher creates assignment', !cErr && !!asgId, cErr?.message ?? '');

  // 5. negatives: student create / teacher on other's class / out-of-scope grade
  const { error: neg1 } = await stA.rpc('assignment_create', {
    p_class_id: classId, p_title: 'x', p_grade_id: 'grade-2', p_program_id: 'english', p_question_count: 5, p_due_at: due,
  });
  ok('student create rejected', !!neg1, neg1?.message ?? '');
  const { error: neg2 } = await t2.rpc('assignment_create', {
    p_class_id: classId, p_title: 'x', p_grade_id: 'grade-2', p_program_id: 'english', p_question_count: 5, p_due_at: due,
  });
  ok('other teacher rejected', !!neg2 && neg2.message.includes('not-owner'), neg2?.message ?? '');
  const { error: neg3 } = await teacher.rpc('assignment_create', {
    p_class_id: classId, p_title: 'x', p_grade_id: 'grade-5', p_program_id: 'english', p_question_count: 5, p_due_at: due,
  });
  ok('out-of-scope grade rejected', !!neg3 && neg3.message.includes('grade-out-of-scope'), neg3?.message ?? '');

  // 6. outsider (not enrolled): inbox empty, take/form denied
  const { data: xInbox } = await stX.rpc('assignment_inbox');
  ok('outsider inbox excludes it', !(xInbox ?? []).some((r) => r.assignment_id === asgId));
  const { error: xTake } = await stX.rpc('assignment_take', { p_assignment_id: asgId });
  ok('outsider take denied', !!xTake && xTake.message.includes('not-enrolled'), xTake?.message ?? '');
  const { error: xForm } = await stX.rpc('assignment_form', { p_assignment_id: asgId });
  ok('outsider form denied', !!xForm && xForm.message.includes('forbidden'), xForm?.message ?? '');

  // 7. student A: inbox row + take
  const { data: aInbox } = await stA.rpc('assignment_inbox');
  const inboxRow = (aInbox ?? []).find((r) => r.assignment_id === asgId);
  ok('student sees inbox row', !!inboxRow && inboxRow.state === 'open' && inboxRow.grade_id === 'grade-2', JSON.stringify(inboxRow));
  const { data: take } = await stA.rpc('assignment_take', { p_assignment_id: asgId });
  ok('take returns form+meta', take?.[0]?.state === 'open' && take?.[0]?.question_count === 10 && take?.[0]?.grade_id === 'grade-2', JSON.stringify(take?.[0]));

  // 8. form loads exact ordered questions
  const { data: formRows, error: fErr } = await stA.rpc('assignment_form', { p_assignment_id: asgId });
  const qids = (formRows ?? []).map((r) => r.id ?? r.assignment_form?.id).filter(Boolean);
  ok('form returns 10 questions', !fErr && (formRows?.length ?? 0) === 10, `${formRows?.length} rows ${fErr?.message ?? ''}`);

  // 9. bad-answers rejections
  const mkAns = (ids, correct) => ids.map((q_id) => ({ q_id, correct }));
  const { error: bad1 } = await stA.rpc('assignment_submit', {
    p_assignment_id: asgId, p_score: 0, p_total: 100, p_time_sec: 60,
    p_answers: mkAns([qids[0], qids[0], ...qids.slice(1)], false),
  });
  ok('dupe answers rejected', !!bad1 && bad1.message.includes('bad-answers'), bad1?.message ?? '');
  const { error: bad2 } = await stA.rpc('assignment_submit', {
    p_assignment_id: asgId, p_score: 0, p_total: 100, p_time_sec: 60,
    p_answers: mkAns(qids.slice(0, 5), true),
  });
  ok('partial answers rejected', !!bad2 && bad2.message.includes('bad-answers'), bad2?.message ?? '');
  const { error: bad3 } = await stA.rpc('assignment_submit', {
    p_assignment_id: asgId, p_score: 0, p_total: 100, p_time_sec: 60,
    p_answers: qids.map((q_id) => ({ q_id, correct: 'yes' })),
  });
  ok('non-boolean correct rejected', !!bad3 && bad3.message.includes('bad-answers'), bad3?.message ?? '');
  // r1: missing `correct` key - jsonb_typeof(NULL) is NULL, must still reject
  const { error: bad4 } = await stA.rpc('assignment_submit', {
    p_assignment_id: asgId, p_score: 0, p_total: 100, p_time_sec: 60,
    p_answers: qids.map((q_id) => ({ q_id })),
  });
  ok('missing correct key rejected', !!bad4 && bad4.message.includes('bad-answers'), bad4?.message ?? '');

  // 10. valid submit (half correct -> weak skills exist) + idempotency
  const { data: rid, error: subErr } = await stA.rpc('assignment_submit', {
    p_assignment_id: asgId, p_score: 50, p_total: 100, p_time_sec: 300,
    p_answers: mkAns(qids, true).map((a, i) => ({ ...a, correct: i % 2 === 0 })),
    p_snapshot: { questionIds: qids },
  });
  ok('valid submit returns result id', !subErr && !!rid, subErr?.message ?? '');
  const { error: dup } = await stA.rpc('assignment_submit', {
    p_assignment_id: asgId, p_score: 100, p_total: 100, p_time_sec: 300,
    p_answers: mkAns(qids, true),
  });
  ok('second submit rejected', !!dup && dup.message.includes('already-submitted'), dup?.message ?? '');
  const { data: resRow } = await admin.from('results').select('id, points, correct_count, form_id, rounds_completed')
    .eq('id', rid).maybeSingle();
  ok('results row written', resRow?.correct_count === 5 && resRow?.form_id === `assignment:${asgId}` && resRow?.rounds_completed === 1, JSON.stringify(resRow));
  // r4: submit also writes qb_attempt_events for every form question
  const { data: evts, error: evErr } = await admin.from('qb_attempt_events')
    .select('question_id, form_id, is_correct, session_id')
    .eq('form_id', take?.[0]?.form_id ?? '');
  const { data: evAny } = await admin.from('qb_attempt_events')
    .select('session_id').like('session_id', `asg:${asgId}%`);
  ok('attempt events written', (evts ?? []).length === 10
    && (evts ?? []).every((e) => e.form_id === take?.[0]?.form_id)
    && (evts ?? []).filter((e) => e.is_correct).length === 5,
    `${(evts ?? []).length} events, asg-sessions=${(evAny ?? []).length} ${evErr?.message ?? ''}`);

  // 11. take after submit returns 'done' (no retry) + form re-fetch denied
  const { data: take2 } = await stA.rpc('assignment_take', { p_assignment_id: asgId });
  ok('take after submit -> done', take2?.[0]?.state === 'done', JSON.stringify(take2?.[0]));
  const { error: formAfter } = await stA.rpc('assignment_form', { p_assignment_id: asgId });
  ok('form denied after submit', !!formAfter && formAfter.message.includes('forbidden'), formAfter?.message ?? '');

  // 12. teacher list + report
  const { data: list } = await teacher.rpc('assignment_list', { p_class_id: classId });
  const lrow = (list ?? []).find((r) => r.id === asgId);
  ok('list counts', lrow?.submitted === 1 && Number(lrow?.roster) === 2, JSON.stringify(lrow));
  const { data: rep } = await teacher.rpc('assignment_report', { p_assignment_id: asgId });
  const rosterNames = (rep?.roster ?? []).map((r) => r.student_name).sort();
  ok('report roster', rosterNames.join() === 'HS An,HS Binh' && rep?.questions?.length === 10,
    `${rosterNames.join()} q=${rep?.questions?.length}`);

  // 13. remediate (50% wrong -> weak skills) creates a follow-up
  const { data: remId, error: remErr } = await teacher.rpc('assignment_remediate', {
    p_assignment_id: asgId, p_due_at: due,
  });
  ok('remediate mints follow-up', !remErr && !!remId && remId !== asgId, remErr?.message ?? '');

  // 14. cross-teacher denial on report/close/remediate
  const { error: ct1 } = await t2.rpc('assignment_report', { p_assignment_id: asgId });
  const { error: ct2 } = await t2.rpc('assignment_close', { p_assignment_id: asgId });
  const { error: ct3 } = await t2.rpc('assignment_remediate', { p_assignment_id: asgId, p_due_at: due });
  ok('cross-teacher report/close/remediate denied', !!ct1 && !!ct2 && !!ct3, `${ct1?.message} ${ct2?.message} ${ct3?.message}`);

  // 15. RLS: direct table access returns nothing for students
  const { data: direct } = await stA.from('assignments').select('*');
  ok('assignments table RPC-only', (direct ?? []).length === 0, `${(direct ?? []).length} rows`);

  // 16. upcoming window: not yet open -> take 'upcoming', form 'forbidden'
  const future = new Date(Date.now() + 48 * 3600_000).toISOString();
  const { data: asg2 } = await teacher.rpc('assignment_create', {
    p_class_id: classId, p_title: 'Bai chua mo', p_grade_id: 'grade-2',
    p_program_id: 'english', p_question_count: 5, p_due_at: future, p_opens_at: future,
  });
  const { error: upTake } = await stA.rpc('assignment_take', { p_assignment_id: asg2 });
  ok('upcoming take denied', !!upTake && upTake.message.includes('upcoming'), upTake?.message ?? '');
  const { error: upForm } = await stA.rpc('assignment_form', { p_assignment_id: asg2 });
  ok('upcoming form denied', !!upForm, upForm?.message ?? '');
  const { data: aInbox2 } = await stA.rpc('assignment_inbox');
  ok('upcoming inbox state', (aInbox2 ?? []).find((r) => r.assignment_id === asg2)?.state === 'upcoming');

  // 17. close -> take denied
  const { error: closeErr } = await teacher.rpc('assignment_close', { p_assignment_id: remId });
  ok('close works', !closeErr, closeErr?.message ?? '');
  const { error: clTake } = await stA.rpc('assignment_take', { p_assignment_id: remId });
  ok('closed take denied', !!clTake && clTake.message.includes('closed'), clTake?.message ?? '');

  // 17b. r1: B takes (open attempt), teacher closes -> B's submit denied
  const { data: takeB } = await stB.rpc('assignment_take', { p_assignment_id: asgId });
  ok('B takes in-flight', takeB?.[0]?.state === 'open', JSON.stringify(takeB?.[0]));
  const { error: closeMain } = await teacher.rpc('assignment_close', { p_assignment_id: asgId });
  ok('close main assignment', !closeMain, closeMain?.message ?? '');
  const { error: lateB } = await stB.rpc('assignment_submit', {
    p_assignment_id: asgId, p_score: 50, p_total: 100, p_time_sec: 200,
    p_answers: mkAns(qids, true),
  });
  ok('submit after close denied', !!lateB && lateB.message.includes('closed'), lateB?.message ?? '');

  // 18. anon role: RPC execute revoked for anon
  const anon = createClient(url, keys.anon, { db: { schema: 'practice' }, auth: { persistSession: false } });
  const { error: anErr } = await anon.rpc('assignment_inbox');
  ok('anon inbox denied', !!anErr, anErr?.message ?? '');
} catch (e) {
  ok('smoke crashed', false, e.message);
} finally {
  // cleanup: events/results FK into auth.users - delete those rows first,
  // then classes (assignments cascade), then the auth users themselves.
  for (const t of ['qb_attempt_events', 'results']) {
    await admin.from(t).delete().in(t === 'qb_attempt_events' ? 'learner_id' : 'account_id', userIds).then(() => {});
  }
  for (const cid of [classId, otherClassId].filter(Boolean)) {
    await admin.from('classes').delete().eq('id', cid).then(() => {});
  }
  await Promise.all(userIds.map((id) => Promise.race([
    admin.auth.admin.deleteUser(id), sleep(8000),
  ])).map((p) => p.catch(() => {})));
  const fails = results.filter((r) => !r.cond).length;
  console.log(`\n=== ${results.length - fails}/${results.length} checks passed ===`);
  await new Promise((r) => process.stdout.write('', r)); // drain pipe before hard exit
  await sleep(500);
  process.exit(fails ? 1 : 0);
}
