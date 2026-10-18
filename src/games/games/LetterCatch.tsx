import { useEffect, useMemo, useRef, useState } from 'react';
import { seededShuffleIndices } from '../../lib/prng';
import { playSfx } from '../../lib/sfx';
import { getWordVisual } from '../../lib/emoji/wordVisual';
import { EmojiVisual } from '../../components/EmojiVisual';
import { spellableWords } from '../sources';
import { GameRoundDots, LetterOrderField, ModelSpeaker, gameVerdictSfx } from '../mechanics';
import { specFor } from '../levels';
import type { GameProps } from '../types';
import type { SpellTile } from '../../types';

const WORDS_PER_RUN = 4;
const EXTRA_LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/** Target letters + 2 distractor bubbles, shuffled deterministically. */
function buildTiles(word: string, key: string, distractCount = 2): SpellTile[] {
  const target = word.toLowerCase();
  const letters: SpellTile[] = target.split('').map((letter, i) => ({ id: `${letter}-${i}`, letter }));
  const distract: SpellTile[] = [];
  let k = 0;
  while (distract.length < distractCount && k < 40) {
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
export default function LetterCatch({ grade, seed, level, onEnd }: GameProps) {
  const spec = specFor(level, WORDS_PER_RUN);
  const words = useMemo(
    () => spellableWords(grade.id, seed, spec.rounds),
    [grade.id, seed, spec.rounds],
  );
  const [wordIdx, setWordIdx] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [wrongTile, setWrongTile] = useState<string | null>(null);
  const [misses, setMisses] = useState(0);
  const [points, setPoints] = useState(0);
  const [done, setDone] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrongTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    },
    [],
  );

  const word = words[Math.min(wordIdx, words.length - 1)];
  const target = word?.word.toLowerCase() ?? '';
  const tiles = useMemo(
    () => (word ? buildTiles(word.word, `${seed}:${word.id}`, 1 + (spec.level ?? 1)) : []),
    [word, seed],
  );

  if (!word) return null;

  const placedWord = placed.map((id) => tiles.find((t) => t.id === id)?.letter ?? '').join('');

  const finishWord = (missCount: number) => {
    // Full points only for a clean word - any wrong bubble drops to 1,
    // so 3 stars means clean play across the run (BA rule).
    const earned = missCount === 0 ? 2 : 1;
    const nextPoints = points + earned;
    const nextDone = done + 1;
    setPoints(nextPoints);
    setDone(nextDone);
    if (nextDone >= words.length) {
      timerRef.current = setTimeout(
        () => onEnd({ points: nextPoints, maxPoints: spec.rounds * 2, correctCount: nextDone , attempted: spec.rounds}),
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
    if (placed.includes(tile.id) || placed.length >= target.length) return;
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
    if (wrongTimerRef.current) clearTimeout(wrongTimerRef.current);
    wrongTimerRef.current = setTimeout(() => setWrongTile(null), 450);
  };

  const visual = getWordVisual(word.id);

  return (
    <div data-testid="game-letter-catch" className="flex flex-col items-center gap-5">
      <GameRoundDots total={words.length} done={done} />
      <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200/70 bg-gradient-to-b from-amber-50 to-orange-100 px-5 py-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.55)]">
        <EmojiVisual emoji={visual?.emoji ?? '❓'} imageUrl={visual?.imageUrl} animated variant="block" className="text-4xl" />
        <span className="font-display text-3xl font-extrabold tracking-[0.3em] text-slate-800">
          {target.split('').map((_, i) => placedWord[i] ?? '_').join('')}
        </span>
      </div>
      <ModelSpeaker word={target} />
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
