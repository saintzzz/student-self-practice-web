// r15 bad: the owner check runs once BEFORE the chunk loop - with a
// 200+ event buffer an account switch between chunks still leaks the
// remaining events to the new identity.
export function createExamTelemetry() {
  const buffer = [];
  const ownerPromise = getSession().then((s) => s?.user?.id ?? null);
  async function ownerStillActive() {
    const session = await getSession();
    return (session?.user?.id ?? null) === (await ownerPromise);
  }
  return {
    async flush() {
      if (!(await ownerStillActive())) { buffer.length = 0; return; }
      while (buffer.length > 0) {
        const events = buffer.splice(0, 200);
        await supabase.rpc('record_attempt_events', { p_events: events });
      }
    },
  };
}
