import { useMemo, useRef, useState } from 'react';
import { seededShuffleIndices } from '../../lib/prng';
import { playSfx } from '../../lib/sfx';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import { spellableWords } from '../sources';
import { GameRoundDots, LetterOrderField, ModelSpeaker, gameVerdictSfx } from '../mechanics';
import type { GameProps } from '../types';
import type { SpellTile } from '../../types';

const WORDS_PER_RUN = 4;
const EXTRA_LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/** Target letters + 2 distractor bubbles, shuffled deterministically. */
function buildTiles(word: string, key: string): SpellTile[] {
  const target = word.toLowerCase();
  const letters: SpellTile[] = target.split('').map((letter, i) => ({ id: `${letter}-${i}`, letter }));
  const distract: SpellTile[] = [];
  let k = 0;
  while (distract.length < 2 && k < 40) {
    const l = EXTRA_LETTERS[seededShuffleIndices(26, `${key}:d${k}`)[0] ?? 0]!;
    k += 1;
    if (!target.includes(l) && !distract.some((d) => d.letter === l)) {
      distract.push({ id: `${l}-x${k}`, letter: l });
    }
  }
  const all = [...letters, ...distract];
  return seededShuffleIndices(all.length, `${key}:ord`).map((i) => all[i]!);
}

/**
 * CR-83 Game 5 - Duoi hinh bat chu (Letter Catch): the target word shows
 * as blanks + picture + hear chip; letter bubbles (real letters + 2
 * distractors) float on the strip. Tap them in spelling order - a wrong
 * bubble shakes and the word still completes, just for fewer points.
 */
export default function LetterCatch({ grade, seed, onEnd }: GameProps) {
  const words = useMemo(
    () => spellableWords(grade.id, seed, WORDS_PER_RUN),
    [grade.id, seed],
  );
  const [wordIdx, setWordIdx] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [wrongTile, setWrongTile] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [points, setPoints] = useState(0);
  const [done, setDone] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const word = words[Math.min(wordIdx, words.length - 1)];
  const target = word?.word.toLowerCase() ?? '';
  const tiles = useMemo(
    () => (word ? buildTiles(word.word, `${seed}:${word.id}`) : []),
    [word, seed],
  );

  if (!word) return null;

  const placedWord = placed.map((id) => tiles.find((t) => t.id === id)?.letter ?? '').join('');

  const finishWord = (missCount: number) => {
    const earned = missCount <= 1 ? 2 : 1;
    const nextPoints = points + earned;
    const nextDone = done + 1;
    setPoints(nextPoints);
    setDone(nextDone);
    if (nextDone >= words.length) {
      timerRef.current = setTimeout(
        () => onEnd({ points: nextPoints, maxPoints: WORDS_PER_RUN * 2, correctCount: nextDone }),
        650,
      );
      return;
    }
    timerRef.current = setTimeout(() => {
      setWordIdx(wordIdx + 1);
      setPlaced([]);
      setMisses(0);
      setWrongTile(null);
    }, 650);
  };

  const tap = (tile: SpellTile) => {
    if (placed.includes(tile.id)) return;
    const expected = target[placed.length];
    if (tile.letter === expected) {
      playSfx('pop');
      const next = [...placed, tile.id];
      setPlaced(next);
      if (next.length === target.length) {
        gameVerdictSfx(true);
        finishWord(misses);
      }
      return;
    }
    gameVerdictSfx(false);
    const nextMisses = misses + 1;
    setMisses(nextMisses);
    setWrongTile(tile.id);
    timerRef.current = setTimeout(() => setWrongTile(null), 450);
  };

  const visual = getWordVisual(word.id);

  return (
    <div data-testid="game-letter-catch" className="flex flex-col items-center gap-5">
      <GameRoundDots total={words.length} done={done} />
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-5 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <span className="text-4xl">{visual?.emoji ?? '❓'}</span>
        <span className="font-display text-3xl font-extrabold tracking-[0.3em] text-slate-800">
          {target.split('').map((_, i) => placedWord[i] ?? '_').join('')}
        </span>
      </div>
      <ModelSpeaker word={target} autoplay={false} />
      <LetterOrderField
        tiles={tiles}
        placedIds={placed}
        wrongTileId={wrongTile}
        onTap={tap}
      />
      <p className="text-sm font-semibold text-slate-300">Chạm các bóng chữ theo đúng thứ tự nhé!</p>
    </div>
  );
}
