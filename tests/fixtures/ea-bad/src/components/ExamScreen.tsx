// r15 bad: onAnswer() fires inside a setPicked() updater - StrictMode
// replays updaters, so the telemetry double-fires.
function WordOrderView({ question, onAnswer }) {
  const [picked, setPicked] = useState([]);
  function pick(i) {
    setPicked((prev) => {
      if (prev.includes(i)) return prev;
      const next = [...prev, i];
      if (next.length === question.tiles.length) {
        onAnswer({ type: 'order', indices: next });
      }
      return next;
    });
  }
  return picked;
}

// r17 bad: the arena challenge resolves the session only at submit -
// no start-owner gate, so a mid-run account switch posts the
// duel under the new identity.
async function settle(arena) {
  const id = await arenaCreate(arena.seed, 'grade-4', 'english', 10, 1000);
  return id;
}
