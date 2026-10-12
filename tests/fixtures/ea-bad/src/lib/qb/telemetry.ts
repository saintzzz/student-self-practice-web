// r14 bad: buffered events have no owner - a flush after an account
// switch re-attributes them to whoever is signed in now.
export function createExamTelemetry() {
  const buffer = [];
  return {
    async flush() {
      const session = await getSession();
      if (!session) { buffer.length = 0; return; }
      await supabase.rpc('record_attempt_events', { p_events: buffer.splice(0) });
    },
  };
}
