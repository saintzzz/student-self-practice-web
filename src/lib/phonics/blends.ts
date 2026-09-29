/**
 * CR-06 phonics - initial consonant blends (PRD section 15.2).
 *
 * getInitialBlend(word) returns the starting consonant cluster of the
 * word's first token when it is a 2- or 3-letter blend like 'bl', 'st' or
 * 'str' - or null when the word does not start with a blend (cat -> null,
 * ship -> null because 'sh' is a digraph, not a blend).
 *
 * Checked longest-first so 'str' wins over 'st' (street -> 'str') and
 * 'thr'/'squ'/'sch'/'shr' win over 'th'/'sc'. Digraph prefixes that are a
 * single phoneme rather than a cluster ('sh', 'ch', 'th' as in thin,
 * 'wh', 'ph', 'qu' alone is NOT included - 'qu' IS a cluster /kw/) plus
 * silent-onset spellings ('wr' write, 'kn' knee, 'gn', 'pn') are
 * deliberately absent from the lists.
 */

const THREE_LETTER_BLENDS = ['scr', 'shr', 'spl', 'spr', 'squ', 'str', 'thr', 'sch'] as const;

const TWO_LETTER_BLENDS = [
  'bl',
  'br',
  'cl',
  'cr',
  'dr',
  'fl',
  'fr',
  'gl',
  'gr',
  'pl',
  'pr',
  'sc',
  'sk',
  'sl',
  'sm',
  'sn',
  'sp',
  'st',
  'sw',
  'tr',
  'tw',
  'qu',
] as const;

/**
 * First-token prefixes where the list above would mislabel the word.
 * 'write' begins 'wr' (silent w, sounded /r/ - not a blend); keep a small
 * exception table for any similar case rather than broadening the rules.
 */
const BLEND_EXCEPTIONS: Record<string, null> = {};

function firstToken(word: string): string {
  return word.trim().toLowerCase().split(/\s+/)[0] ?? '';
}

export function getInitialBlend(word: string): string | null {
  const token = firstToken(word);
  if (token in BLEND_EXCEPTIONS) {
    return null;
  }
  for (const blend of THREE_LETTER_BLENDS) {
    if (token.startsWith(blend)) {
      return blend;
    }
  }
  for (const blend of TWO_LETTER_BLENDS) {
    if (token.startsWith(blend)) {
      return blend;
    }
  }
  return null;
}
