/**
 * CR-145 r225: group art resolution for the counting/describe option sets.
 *
 * Two all-or-nothing tiers, checked across the WHOLE visible group so a
 * question never mixes art styles (the all-or-nothing law):
 *
 *   'single' - every option has bespoke counting art (one scene image
 *              containing N objects). Rare today: the manifest holds ~1
 *              count per slug while distractor rules need several.
 *   'repeat' - every option resolves concept art; EmojiVisual then
 *              renders the picture `count` times (N copies of the same
 *              kawaii object = "N objects", full vocab coverage).
 *
 * Returns null when neither tier covers every option -> repeated emoji.
 */
import type { CountingImageOption } from '../../types';
import { allWords } from './contentBank';
import { getWordVisual } from '../emoji/wordVisual';
import { COUNTING_ART } from './countingArt';

export type CountingArtMode = 'single' | 'repeat';

/* r226: repeat tier assumes one object per concept image. Words whose
   audited art depicts MULTIPLE of the counted unit are excluded (the
   group falls back to emoji instead of lying about the count). 'team',
   'forest', 'nest', 'couple' stay: those depict ONE team/forest/nest/
   couple - the named unit matches the picture. Entries are matched on
   wordId AND lowercased word text (legacy bank rows carry no wordId).
   Audited r226: 'grape' shows a ~15-grape bunch - "3 grapes" would render
   3 bunches. Regenerate a single-grape asset via the artgen loop, then
   remove the entry (see docs/project/CR-145-art-wiring-dedupe.md). */
export const REPEAT_ART_EXCLUDE: ReadonlySet<string> = new Set(['grape']);

function repeatExcluded(option: Pick<CountingImageOption, 'word' | 'wordId'>): boolean {
  return (
    (option.wordId !== undefined && REPEAT_ART_EXCLUDE.has(option.wordId)) ||
    REPEAT_ART_EXCLUDE.has(option.word.trim().toLowerCase())
  );
}

export function countingArtKey(option: Pick<CountingImageOption, 'word' | 'count'>): string {
  const slug = option.word.trim().toLowerCase().replace(/\s+/g, '-');
  return `${slug}|${option.count}`;
}

/* Bank rows predate option.wordId (r225): resolve the option's word TEXT
   to its VocabWord id - ids are word slugs for ~95% of the bank, and a
   text-keyed map covers the exceptions (kiwi fruit, piñata, o'clock). */
let WORD_ID_BY_TEXT: ReadonlyMap<string, string> | null = null;

function wordIdFor(option: Pick<CountingImageOption, 'word' | 'wordId'>): string | undefined {
  if (option.wordId !== undefined) return option.wordId;
  if (WORD_ID_BY_TEXT === null) {
    const words = allWords();
    /* Same rule as wordVisual: never freeze an empty table - a pre-load
       read must not permanently disable repeat art for the session. */
    if (words.length === 0) return undefined;
    WORD_ID_BY_TEXT = new Map(words.map((w) => [w.word.trim().toLowerCase(), w.id]));
  }
  return WORD_ID_BY_TEXT.get(option.word.trim().toLowerCase());
}

export function resolveCountingGroupArt(
  options: readonly Pick<CountingImageOption, 'word' | 'count' | 'wordId'>[],
): CountingArtMode | null {
  if (options.length === 0) return null;
  if (options.every((o) => COUNTING_ART[countingArtKey(o)] !== undefined)) {
    return 'single';
  }
  if (options.every((o) => {
    if (repeatExcluded(o)) return false;
    const id = wordIdFor(o);
    return id !== undefined && getWordVisual(id)?.imageUrl !== undefined;
  })) {
    return 'repeat';
  }
  return null;
}

export function countingOptionArtUrl(
  option: Pick<CountingImageOption, 'word' | 'count' | 'wordId'>,
  mode: CountingArtMode,
): string | undefined {
  if (mode === 'single') {
    return COUNTING_ART[countingArtKey(option)];
  }
  const id = wordIdFor(option);
  return id !== undefined ? getWordVisual(id)?.imageUrl : undefined;
}
