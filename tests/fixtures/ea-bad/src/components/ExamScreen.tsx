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
