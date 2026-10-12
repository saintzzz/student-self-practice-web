// r15 good: the owner check runs inside the chunk loop before every
// splice - an account switch mid-flush drops the remaining buffer.
export function createExamTelemetry() {
  const buffer = [];
  const ownerPromise = getSession().then((s) => s?.user?.id ?? null);
  async function ownerStillActive() {
    const session = await getSession();
    return (session?.user?.id ?? null) === (await ownerPromise);
  }
  return {
    async flush() {
      const session = await getSession();
      if (!session) { buffer.length = 0; return; }
      if ((session.user?.id ?? null) !== (await ownerPromise)) { buffer.length = 0; return; }
      while (buffer.length > 0) {
        if (!(await ownerStillActive())) { buffer.length = 0; return; }
        const events = buffer.splice(0, 200);
        await supabase.rpc('record_attempt_events', { p_events: events });
      }
    },
  };
}
