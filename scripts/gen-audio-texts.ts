/**
 * CR-19: enumerates every English text the app can speak, so each one
 * can be pre-rendered to an mp3 and hosted on Supabase Storage.
 *
 * Output: audio-texts.tsv  - one `sha1(text)\ttext` line per unique text.
 * The sha1 is the same digest speech.ts computes at runtime, so the
 * object name is derivable without shipping a manifest.
 *
 * Run: npx vite-node scripts/gen-audio-texts.ts
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { ALL_WORDS } from '../src/data/vocabulary';
import { generateListeningSentenceFillBlankQuestions } from '../src/lib/generators/listeningSentenceFillBlank';
import { getSoundUtterance } from '../src/lib/phonics/initialSounds';

const VOWEL_LETTERS = new Set(['a', 'e', 'i', 'o', 'u']);
function article(word: string): 'a' | 'an' {
  const firstLetter = word.trim().charAt(0).toLowerCase();
  return VOWEL_LETTERS.has(firstLetter) ? 'an' : 'a';
}

const texts = new Map<string, 'word' | 'sentence'>();

// 1. Bare words (ListeningFillBlank, ListeningImageChoice, phonics word questions)
for (const w of ALL_WORDS) texts.set(w.word, 'word');

// 2. Sentence fill-blank: word x every template in its class
for (const q of generateListeningSentenceFillBlankQuestions(ALL_WORDS)) {
  texts.set(q.sentence, 'sentence');
}

// 3. Describe-and-choose-image: count + negation sentences (countable only)
const COUNT_SPREAD = [1, 2, 3, 4, 5];
for (const w of ALL_WORDS) {
  if (!w.countable) continue;
  for (const count of COUNT_SPREAD) {
    texts.set(
      count === 1
        ? `There is ${article(w.word)} ${w.word}.`
        : `There are ${count} ${w.plural ?? `${w.word}s`}.`,
      'sentence',
    );
  }
  texts.set(`There isn't ${article(w.word)} ${w.word} here.`, 'sentence');
}

// 4. Phonics sound utterances ("c, as in cat") - one per sound key
const SOUND_KEYS = [
  'a', 'b', 'c', 'ch', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 'sh', 't', 'th', 'u', 'v', 'w', 'x', 'y', 'z',
];
for (const s of SOUND_KEYS) texts.set(getSoundUtterance(s), 'word');

// hash<TAB>type<TAB>text - Ana reads words, Andrew reads sentences (CR-19 r2)
const lines = [...texts.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([t, kind]) => `${createHash('sha1').update(t).digest('hex')}\t${kind}\t${t}`);

writeFileSync('audio-texts.tsv', lines.join('\n') + '\n');
console.log(`texts: ${lines.length}`);
