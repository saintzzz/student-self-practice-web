import { ALL_WORDS } from '../../data/vocabulary';

/**
 * Phonics dimension for CR-03 (research doc 2.2: each SGK Tieng Anh 2 unit
 * is tied to one phonics sound). Maps a word to its initial *sound* group
 * key - lowercase letter or consonant digraph ('ch', 'sh', 'th') - which is
 * not always its first letter ('chef' starts with c but sounds /sh/,
 * 'write' sounds /r/, 'giraffe' sounds /j/).
 *
 * Kept as a pure derivation (no VocabWord field) so the vocabulary bank and
 * its baseline fixtures stay untouched; the exceptions table below encodes
 * the small set of English spelling-vs-sound mismatches present in the
 * Grade-2 bank.
 */

/**
 * Words whose initial sound does not match the default digraph/first-letter
 * rule. Keyed on the lowercase word text.
 *
 * - chef /shef/ -> 'sh' (ch- words otherwise map to /ch/ like chicken)
 * - giraffe /jiraf/ -> 'j'
 * - circle /serkel/ -> 's' (soft c; the only soft-c word in the bank)
 * - write /rait/ -> 'r' (silent w)
 * - one /wun/ -> 'w' (leading /w/ sound, like 'white')
 *
 * Content audit 2026-10 additions (verified against the actual bank):
 * - christmas /krismes/ -> 'k' (ch- digraph rule would give /ch/)
 * - thailand /tailand/ -> 't' (th- digraph rule would give /th/)
 * - giant, geography /j-/ -> 'j' (soft g before i/e)
 * - cinema, cycle /s-/ -> 's' (soft c before i/y)
 * - photography, photographer /f-/ -> 'f' (ph- is /f/)
 */
const INITIAL_SOUND_EXCEPTIONS: Readonly<Record<string, string>> = {
  chef: 'sh',
  giraffe: 'j',
  circle: 's',
  write: 'r',
  one: 'w',
  christmas: 'k',
  thailand: 't',
  giant: 'j',
  geography: 'j',
  cinema: 's',
  cycle: 's',
  photography: 'f',
  photographer: 'f',
  // Round 2 of the audit (xp bank uses the same table):
  // soft c: celebrate, cyprus /s-/
  celebrate: 's',
  cyprus: 's',
  // soft g: genie, georgia, germany, gibraltar, ginger /j-/
  genie: 'j',
  georgia: 'j',
  germany: 'j',
  gibraltar: 'j',
  ginger: 'j',
  // ph- = /f/: phone (saxophone resolves on its own first letter 's')
  phone: 'f',
  // CR-76: "CD" is a letter-name word - /s-/ onset ("see-dee"), not /k-/.
  cd: 's',
  // rh- = /r/: rhinoceros
  rhinoceros: 'r',
  // silent w/k: wrestling, knot
  wrestling: 'r',
  knot: 'n',
  // /ju:/ onset sounds like the letter-name 'y': euro, ufo, unicorn
  euro: 'y',
  ufo: 'y',
  unicorn: 'y',
  // x-ray starts /eks/ - vowel onset keyed 'e' (letter-name 'x' is "ex").
  'x-ray': 'e',
  // hourglass starts /au/ - no letter group carries that onset, so it is
  // excluded from phonics questions entirely via the empty key.
  hourglass: '',
};

const DIGRAPHS = ['ch', 'sh', 'th'] as const;

/**
 * Distinct sound-group keys that a Grade-2 learner hears as the SAME
 * initial phoneme. 'c' and 'k' are both /k/ at word start ("cat",
 * "kite"), so a hard-c word can never be a distractor under a 'k'
 * prompt (and vice versa). 'circle' is already remapped to 's', so
 * soft c never collides. Extend this table if the bank gains another
 * spelling pair that shares a phoneme.
 */
const SAME_PHONEME_GROUPS: readonly (readonly string[])[] = [['c', 'k']];

/**
 * True when two sound-group keys represent the same initial phoneme.
 * The generators use this to keep the exactly-one-correct invariant
 * honest for a child answering by ear.
 */
export function soundsSharePhoneme(a: string, b: string): boolean {
  if (a === b) return true;
  return SAME_PHONEME_GROUPS.some((group) => group.includes(a) && group.includes(b));
}

/**
 * All keys equivalent to `sound` under soundsSharePhoneme, excluding the
 * key itself. Used to widen generator exclude lists.
 */
export function equivalentSounds(sound: string): string[] {
  for (const group of SAME_PHONEME_GROUPS) {
    if (group.includes(sound)) {
      return group.filter((s) => s !== sound);
    }
  }
  return [];
}

/**
 * The initial-sound group key for a word or free-form text: 'a'..'z' or a
 * consonant digraph 'ch'/'sh'/'th'. 'wh-' words collapse to 'w' (the /w/
 * sound is what Grade-2 phonics teaches - "white", "whale" belong to the w
 * group). Multi-word entries resolve on their first token ("hot dog" ->
 * 'h'). Returns an empty string for input with no leading letter
 * (defensive; no such word exists in the bank).
 */
export function getInitialSound(text: string): string {
  const normalized = text.trim().toLowerCase();
  const firstToken = normalized.split(/\s+/)[0] ?? '';
  const exception = INITIAL_SOUND_EXCEPTIONS[normalized] ?? INITIAL_SOUND_EXCEPTIONS[firstToken];
  if (exception !== undefined) {
    return exception;
  }

  for (const digraph of DIGRAPHS) {
    if (normalized.startsWith(digraph)) {
      return digraph;
    }
  }

  const first = normalized.match(/[a-z]/);
  return first ? first[0]! : '';
}

/**
 * A short example word for each sound-group key, used when speaking a
 * sound prompt. Web Speech reads a bare key like "c" or "sh" as letter
 * names ("see"), which is misleading phonetically - "c, as in cat"
 * carries the actual sound through the example. Cover every key the
 * bank can produce; the fallback repeats the key if a new group key
 * ever appears.
 */
const SOUND_UTTERANCE_EXAMPLES: Readonly<Record<string, string>> = {
  a: 'apple',
  b: 'ball',
  c: 'cat',
  ch: 'chicken',
  d: 'dog',
  e: 'egg',
  f: 'fish',
  g: 'girl',
  h: 'hat',
  i: 'ice cream',
  j: 'jam',
  k: 'kite',
  l: 'lion',
  m: 'milk',
  n: 'nose',
  o: 'orange',
  p: 'pig',
  q: 'queen',
  r: 'rabbit',
  s: 'sun',
  sh: 'ship',
  t: 'tiger',
  th: 'three',
  u: 'umbrella',
  v: 'van',
  w: 'water',
  x: 'x-ray',
  y: 'yellow',
  z: 'zebra',
};

/**
 * Ordered example candidates for a sound: the canonical example first,
 * then every other bank word sharing the initial sound (alphabetical).
 * CR-76: the word-choice question speaks `exampleCandidates[0]` unless it
 * IS the answer word - in that case it advances to [1] - so the audio
 * never names the correct option ("c, as in cat" while 'cat' is the
 * answer would leak it). Only the first two candidates are ever picked;
 * gen-audio-texts.ts renders exactly those two utterances per sound.
 */
// Candidates are bank-derived and immutable - memoize per sound so
// question renders do not re-filter/re-sort ALL_WORDS twice (r26 F2).
const EXAMPLE_CANDIDATES: Map<string, string[]> = new Map();
function soundExampleCandidates(sound: string): string[] {
  let cached = EXAMPLE_CANDIDATES.get(sound);
  if (!cached) {
    const canonical = SOUND_UTTERANCE_EXAMPLES[sound];
    // Examples must read like the sound: only plain lowercase single words.
    // Acronyms are excluded (CD is /s-/ not /k-/; see exceptions above) and
    // multi-word entries make poor "as in" anchors for young readers.
    const others = ALL_WORDS.filter(
      (w) => /^[a-z]+$/.test(w.word) && w.word !== canonical && getInitialSound(w.word) === sound,
    )
      .map((w) => w.word)
      .sort();
    cached = canonical ? [canonical, ...others] : others;
    EXAMPLE_CANDIDATES.set(sound, cached);
  }
  return cached;
}

/** First example candidate that is not `excludeWord` (the answer word). */
export function getSoundExample(sound: string, excludeWord?: string): string | undefined {
  return soundExampleCandidates(sound).find((w) => w !== excludeWord);
}

export function getSoundUtterance(sound: string, excludeWord?: string): string {
  const example = getSoundExample(sound, excludeWord);
  return example ? `${sound}, as in ${example}` : sound;
}
