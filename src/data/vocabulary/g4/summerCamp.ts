import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { CAMPING_WORDS } from '../camping';

export const G4_SUMMER_CAMP_TOPIC: Topic = { id: 'g4-summer-camp', gradeId: 'grade-4', name: 'Trại hè' };

/** Global Success G4 summer-camp unit - the shared camping kit as review.
    'marshmallow' (🍡 reads as dango) and 'binoculars' (no emoji) stay out
    per PRD 7.3. */
export const G4_SUMMER_CAMP_WORDS: VocabWord[] = [
  ...pick(CAMPING_WORDS, 'tent', 'torch', 'compass', 'map', 'lantern', 'boot', 'canoe', 'fishing-rod'),
];
