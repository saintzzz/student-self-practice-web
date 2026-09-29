/**
 * CR-06 phonics - rhyming / rime families (PRD section 15.2).
 *
 * getRhymeGroup(word) returns the SOUND-family key the word rhymes into.
 * Two words rhyme when their keys are equal AND neither contains the other
 * as a whole word (the generator additionally enforces the containment
 * rule - "hot dog" never counts as rhyming with "dog").
 *
 * Model (BA ruling 15.2, audit-verified against the full bank):
 *   1. spelledRime(word): the spelled rime of the LAST token - substring
 *      from the last vowel cluster to the end, ignoring a single trailing
 *      silent 'e' for vowel detection but keeping it in the rime
 *      (cake/snake/pancake -> 'ake', rain/train -> 'ain', book -> 'ook').
 *      This already separates look-alikes like juice ('uice') from
 *      dice/rice ('ice').
 *   2. RHYME_OVERRIDES: per-word corrections where spelled rime and sound
 *      disagree - splits false-positive pairs (mountain looks like
 *      rain/train but is 'solo:mountain'; elephant/eggplant share their
 *      own weak-'ant' key so ant stays alone) and merges true rhymes with
 *      different spellings (plane -> 'ain', square/chair -> 'ear',
 *      two/shoe/canoe/blue/kangaroo -> 'u-long', one -> 'un',
 *      bread -> 'ed', cry/fly/butterfly -> 'i-rime').
 *   3. 'solo:<word>' keys are deliberately unique - a word no other bank
 *      word rhymes with. The generator drops singleton families.
 */

/** Spelled-rime look-alikes that do NOT rhyme, split onto unique keys,
 * plus cross-spelling merges onto a shared canonical key. */
const RHYME_OVERRIDES: Record<string, string> = {
  // -ain group: rain/train rhyme; mountain ends /ənt/, not /eɪn/.
  mountain: 'solo:mountain',
  // plane rhymes with rain/train despite the -ane spelling.
  plane: 'ain',

  // -ant group: ant /ænt/ vs elephant/eggplant /ənt/ - the latter pair
  // rhyme with each other, so they share a weak key; ant stays alone.
  elephant: 'ant-weak',
  eggplant: 'ant-weak',

  // -ead/-ed: bread rhymes with red/bed (/ɛd/) despite the spelling;
  // read (present tense /riːd/) and the -ed adjectives do not.
  bread: 'ed',
  read: 'solo:read',
  scared: 'solo:scared',
  tired: 'solo:tired',
  surprised: 'solo:surprised',
  excited: 'solo:excited',

  // -ear group: bear/pear/teddy bear rhyme; "ear" itself is /ɪə(r)/ and
  // square/chair rhyme across spellings.
  ear: 'solo:ear',
  square: 'ear',
  chair: 'ear',

  // -ie group: tie/pie /aɪ/ rhyme; cookie /iː/ does not.
  cookie: 'solo:cookie',

  // -ion group: accordion/onion/television end /ən/; lion /aɪən/ does not.
  lion: 'solo:lion',

  // /uː/ family across spellings: two/shoe/canoe/blue/kangaroo all rhyme;
  // the rest of spelled-'o' (hippo, mango, piano, ...) is /oʊ/ and stays.
  two: 'u-long',
  shoe: 'u-long',
  canoe: 'u-long',
  blue: 'u-long',
  kangaroo: 'u-long',

  // -one group: one /wʌn/ rhymes with sun/run; saxophone does not.
  one: 'un',
  saxophone: 'solo:saxophone',

  // -oot group: foot /ʊt/ does not rhyme with boot /uːt/.
  foot: 'solo:foot',

  // -ot group: parrot/robot/pilot/carrot/teapot end /ət/; hot is /ɒt/.
  hot: 'solo:hot',

  // -ow group: yellow/snow/rainbow/window end /oʊ/; cow is /aʊ/.
  cow: 'solo:cow',

  // -y group: strawberry/cherry/baby/candy/happy/angry end /iː/;
  // cry/fly/butterfly end /aɪ/.
  cry: 'i-rime',
  fly: 'i-rime',
  butterfly: 'i-rime',

  // -an group: swan /ɒn/ vs policeman /ən/.
  swan: 'solo:swan',
  policeman: 'solo:policeman',

  // -and group: island /ənd/ vs hand /ænd/ - hand stays alone.
  island: 'solo:island',

  // -ar group: car/star/guitar/jar /ɑː(r)/ vs calendar/caterpillar /ə(r)/.
  calendar: 'ar-weak',
  caterpillar: 'ar-weak',

  // -ate group: chocolate /ət/ vs skate /eɪt/ - skate stays alone.
  chocolate: 'solo:chocolate',
};

const VOWEL = /[aeiouy]/;

function lastToken(word: string): string {
  const tokens = word.trim().toLowerCase().split(/\s+/);
  return tokens[tokens.length - 1] ?? '';
}

/** Spelled rime of the last token (see module doc for the algorithm). */
function spelledRime(word: string): string {
  const token = lastToken(word);
  if (token.length === 0) {
    return '';
  }
  const search = token.endsWith('e') && token.length > 1 ? token.slice(0, -1) : token;
  let i = search.length - 1;
  while (i >= 0 && !VOWEL.test(search[i]!)) {
    i--;
  }
  if (i < 0) {
    return token;
  }
  while (i > 0 && VOWEL.test(search[i - 1]!)) {
    i--;
  }
  return token.slice(i);
}

export function getRhymeGroup(word: string): string {
  const normalized = word.trim().toLowerCase();
  return RHYME_OVERRIDES[normalized] ?? spelledRime(normalized);
}

/**
 * True when `candidate`'s tokens do not contain `word`'s tokens (or vice
 * versa) as a contiguous run - "hot dog"/"dog", "table tennis"/"tennis",
 * "jellyfish"/"fish", "palm tree"/"tree" all fail this check even though
 * they land in the same rhyme group.
 */
function containsAsTokens(outer: string, inner: string): boolean {
  if (outer === inner) {
    return true;
  }
  const outerTokens = outer.trim().toLowerCase().split(/\s+/);
  const innerTokens = inner.trim().toLowerCase().split(/\s+/);
  if (innerTokens.length > outerTokens.length) {
    return false;
  }
  for (let start = 0; start <= outerTokens.length - innerTokens.length; start++) {
    if (innerTokens.every((token, i) => outerTokens[start + i] === token)) {
      return true;
    }
    // Also catch the embedded-compound case: "notebook" containing "book".
    if (innerTokens.length === 1 && outerTokens.some((t) => t !== innerTokens[0] && t.includes(innerTokens[0]!))) {
      return true;
    }
  }
  return false;
}

/** Same rhyme group AND not the same/contained word - a real rhyme pair. */
export function rhymesWith(word: string, candidate: string): boolean {
  const a = word.trim().toLowerCase();
  const b = candidate.trim().toLowerCase();
  if (a === b || containsAsTokens(a, b) || containsAsTokens(b, a)) {
    return false;
  }
  return getRhymeGroup(a) === getRhymeGroup(b);
}
