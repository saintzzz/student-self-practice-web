import type { Topic, VocabWord } from '../../../types';
import { pick } from '../shared';
import { G3_WEATHER_WORDS } from '../g3/weather';

export const G4_SEASONS_TOPIC: Topic = { id: 'g4-seasons', gradeId: 'grade-4', name: 'Mùa và thời tiết' };

const t = G4_SEASONS_TOPIC.id;

/** Global Success G4 seasons unit - four new season nouns plus shared weather words for review. */
export const G4_SEASONS_WORDS: VocabWord[] = [
  { id: 'spring', topicId: t, word: 'spring', plural: 'springs', emoji: '🌱', countable: true, explanation: 'Mùa xuân tiếng Anh là "spring".' },
  { id: 'summer', topicId: t, word: 'summer', plural: 'summers', emoji: '🌞', countable: true, explanation: 'Mùa hè tiếng Anh là "summer".' },
  { id: 'autumn', topicId: t, word: 'autumn', plural: 'autumns', emoji: '🍂', countable: true, explanation: 'Mùa thu tiếng Anh là "autumn".' },
  { id: 'winter', topicId: t, word: 'winter', plural: 'winters', emoji: '☃️', countable: true, explanation: 'Mùa đông tiếng Anh là "winter".' },
  ...pick(G3_WEATHER_WORDS, 'sun', 'rain', 'cloud', 'snow', 'storm'),
];
