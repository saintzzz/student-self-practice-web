// r14 good: events are bound to the identity captured at creation -
// a flush under a changed session drops them instead of re-attributing.
export function createExamTelemetry() {
  const buffer = [];
  const ownerPromise = getSession().then((s) => s?.user?.id ?? null);
  return {
    async flush() {
      const session = await getSession();
      if (!session) { buffer.length = 0; return; }
      if ((session.user?.id ?? null) !== (await ownerPromise)) { buffer.length = 0; return; }
      await supabase.rpc('record_attempt_events', { p_events: buffer.splice(0) });
    },
  };
}
