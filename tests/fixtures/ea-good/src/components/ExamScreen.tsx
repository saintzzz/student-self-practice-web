export const Banner = ({ exam }) => (exam.poolShort || exam.droppedCount > 0) && <div>warning</div>;

// r15 good: pure updater - the answer submit runs outside setPicked.
function WordOrderView({ question, onAnswer }) {
  const [picked, setPicked] = useState([]);
  function pick(i) {
    if (picked.includes(i)) return;
    const next = [...picked, i];
    setPicked(next);
    if (next.length === question.tiles.length) {
      onAnswer({ type: 'order', indices: next });
    }
  }
  return picked;
}
