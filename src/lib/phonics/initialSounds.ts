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
 */
const INITIAL_SOUND_EXCEPTIONS: Readonly<Record<string, string>> = {
  chef: 'sh',
  giraffe: 'j',
  circle: 's',
  write: 'r',
  one: 'w',
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
  const exception = INITIAL_SOUND_EXCEPTIONS[normalized];
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

export function getSoundUtterance(sound: string): string {
  const example = SOUND_UTTERANCE_EXAMPLES[sound];
  return example ? `${sound}, as in ${example}` : sound;
}
