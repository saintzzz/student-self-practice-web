/**
 * CR-82 (DESIGN-SPEC-v5 s13.5 V3 / R2-1): the reviewed topic allowlist
 * for the G1-2 gap word bank. A topic enters ONLY after a content review
 * recorded in `docs/content/GAP-BANK-REVIEW.md` (H-4) - the `reviewedIn`
 * field cites its row. Topics that mix semantic sub-fields declare
 * `groups` of word ids; V3 then requires the answer and BOTH distractors
 * to sit in the same group.
 *
 * Note: shared words keep their canonical (earliest) topicId
 * (src/data/vocabulary/shared.ts), so G1 units reuse the `g2-*` ids -
 * e.g. the G1 pets words carry `g2-animals`.
 */
export interface GapBankTopicEntry {
  groups?: readonly (readonly string[])[];
  /** Row reference in docs/content/GAP-BANK-REVIEW.md. */
  reviewedIn: string;
}

export const GAP_BANK_TOPICS: Readonly<Record<string, GapBankTopicEntry>> = {
  /* Single semantic field (pets/animals); V2 article frames already
     split "a cat" from "an owl" so no groups are needed. */
  'g2-animals': { reviewedIn: 'GAP-BANK-REVIEW.md R-01' },
  /* Toys and school things kids hold - all countable object nouns in
     one semantic field. Covers the G1 toys/yo-yo words too. */
  'g2-toys': { reviewedIn: 'GAP-BANK-REVIEW.md R-02' },
  'g1-toys': { reviewedIn: 'GAP-BANK-REVIEW.md R-02' },
  /* Colour adjectives - identical frames ("I like ___"), one field. */
  'g2-colors': { reviewedIn: 'GAP-BANK-REVIEW.md R-03' },
  'g1-colors': { reviewedIn: 'GAP-BANK-REVIEW.md R-03' },
  /* Countable/mass food mix - V2 splits the countable "a/an" frames
     from the mass "some ___" frames; still one semantic field. The G1
     food unit is a pure pick() of these words (no g1-canonical ids). */
  'g2-food': { reviewedIn: 'GAP-BANK-REVIEW.md R-04' },
  /* Fruits - one field; 'pear' is protected by the homophone list. */
  'g2-fruits': { reviewedIn: 'GAP-BANK-REVIEW.md R-05' },
  /* Cardinal numbers - identical "count to ___" frame, one field;
     'four'/'eight'/'two' homophones are in HOMOPHONE_PAIRS. The G1
     numbers unit is also a pure pick() of these words. */
  'g2-numbers': { reviewedIn: 'GAP-BANK-REVIEW.md R-06' },
  /* The spec s13.5 worked example: g2-kitchen mixes semantic sub-fields
     (utensils vs foods) plus an outlier person (`chef`, which V2's
     occupation frames already reject) - so it ships with reviewed
     `groups`. Ungrouped words (chef) can never form a bank. */
  'g2-kitchen': {
    groups: [
      ['spoon', 'teapot', 'chopsticks', 'jar', 'sponge'],
      ['salt', 'butter', 'ice'],
    ],
    reviewedIn: 'GAP-BANK-REVIEW.md R-07',
  },
};

/**
 * Homophone / near-homophone pairs (spec s13.5 V4): two bank options
 * that sound the same cannot be told apart by listening, so they are
 * never allowed together. Grows with review findings.
 */
export const HOMOPHONE_PAIRS: readonly (readonly [string, string])[] = [
  ['four', 'for'],
  ['two', 'too'],
  ['two', 'to'],
  ['sea', 'see'],
  ['son', 'sun'],
  ['eight', 'ate'],
  ['pear', 'pair'],
  ['right', 'write'],
  ['blue', 'blew'],
  ['no', 'know'],
  ['hour', 'our'],
];
