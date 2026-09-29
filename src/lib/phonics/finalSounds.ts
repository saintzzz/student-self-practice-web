/**
 * CR-06 phonics - final sounds (PRD section 15.2).
 *
 * getFinalSound(word) returns the key for the word's LAST sounded
 * letter/digraph - same key style as getInitialSound: a single letter
 * 'a'..'z' or a digraph 'sh' | 'ch' | 'th' | 'ng'. Multi-word entries use
 * the last token ("hot dog" -> 'g').
 *
 * The letter-level key convention (audit ruling 15.6): groups map to the
 * LETTER the ending sounds like to a Grade 2 learner, not strict phonemes.
 * 'k' endings group /k/ regardless of spelling (duck/notebook/cake -> 'k'),
 * '-se'/'-ce' endings group as 's' even though some are phonetically /z/
 * (nose/cheese -> 's') - the voiced/unvoiced nuance is a known, accepted
 * residual at this level.
 *
 * Rule order (each step checked top-down, first match wins):
 *   1. EXCEPTIONS table - spelling rules that produce a wrong key.
 *   2. 'ck' ending -> 'k' (duck -> 'k', NOT 'ck' - ck is just doubled k).
 *   3. Digraph endings sh/ch/th/ng -> themselves (fish->'sh', watch->'ch',
 *      mouth->'th', sing->'ng').
 *   4. Doubled-final collapse (ball->'l', dress->'s', egg->'g', boss->'s').
 *   5. Vowel digraphs ending in 'e' (tree/bee/knee end '-ee' -> 'e').
 *   6. Silent-e strip: remove ONE trailing 'e', then map the newly-final
 *      letter: 'c' -> 's' (dice/rice/juice/ice), 'g' -> 'j' (orange/
 *      cabbage - soft g), doubled letters collapse (giraffe->'f',
 *      apple->'l'), anything else returns the letter itself
 *      (cake->'k', five->'v', plane->'n', home->'m', blue->'u').
 *   7. Fallback: last letter.
 */

/** Word-level exceptions where the rule chain produces the wrong key. */
const FINAL_SOUND_EXCEPTIONS: Record<string, string> = {
  // "eye" would strip -e -> "ey" -> 'y'; its ending is a vowel sound,
  // keyed 'e' like getInitialSound's vowel-letter convention.
  eye: 'e',
  // Silent b: "climb" ends /m/, not /b/ (same -mb family as lamb/comb).
  climb: 'm',
  // "-augh" sounds /f/ (same family as cough/tough/enough): letter 'h'
  // would mislead a child answering by ear.
  laugh: 'f',
};

/** Silent-e: consonant+'c' endings sound /s/ (soft c), 'g' endings /dʒ/ (soft g). */
const SOFT_AFTER_SILENT_E: Record<string, string> = {
  c: 's',
  g: 'j',
};

const DIGRAPHS = ['sh', 'ch', 'th', 'ng'] as const;

function lastToken(word: string): string {
  const tokens = word.trim().toLowerCase().split(/\s+/);
  return tokens[tokens.length - 1] ?? '';
}

export function getFinalSound(word: string): string {
  const token = lastToken(word);
  const exception = FINAL_SOUND_EXCEPTIONS[word.trim().toLowerCase()] ?? FINAL_SOUND_EXCEPTIONS[token];
  if (exception) {
    return exception;
  }

  if (token.endsWith('ck')) {
    return 'k';
  }

  for (const digraph of DIGRAPHS) {
    if (token.endsWith(digraph)) {
      return digraph;
    }
  }

  if (token.length >= 2 && token[token.length - 1] === token[token.length - 2]) {
    return token[token.length - 1]!;
  }

  if (token.endsWith('ee')) {
    return 'e';
  }

  if (token.endsWith('e') && token.length > 1) {
    const stem = token.slice(0, -1);
    const last = stem[stem.length - 1]!;
    return SOFT_AFTER_SILENT_E[last] ?? last;
  }

  return token[token.length - 1] ?? '';
}
